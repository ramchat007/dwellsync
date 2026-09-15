import { RoleId, MembershipStatus } from "../types/database";
import { UserIdentity } from "../types/auth";

export const ALLOWED_ASSIGNABLE_ROLES: RoleId[] = [
  "SOCIETY_ADMIN",
  "SECRETARY",
  "TREASURER",
  "COMMITTEE_MEMBER",
  "MANAGER",
  "RESIDENT",
  "OWNER",
  "TENANT",
  "SECURITY",
  "STAFF",
  "VENDOR",
  "AUDITOR",
];

export const SOCIETY_ADMIN_ROLES: RoleId[] = [
  "SOCIETY_ADMIN",
  "SECRETARY",
  "MANAGER",
];

export const ROLE_MANAGEMENT_ROLES: RoleId[] = [
  "SUPER_ADMIN",
  "SOCIETY_ADMIN",
  "SECRETARY",
];

export const VALID_MEMBERSHIP_STATUSES: MembershipStatus[] = [
  "ACTIVE",
  "SUSPENDED",
  "REMOVED",
  "INVITED",
];

/**
 * Checks if the identity has society administration rights for targetSocietyId.
 * - Non-impersonating SUPER_ADMIN has platform-wide authority.
 * - Impersonating user must target targetSocietyId AND have an administrative role.
 * - Regular user must belong to targetSocietyId with an administrative role.
 */
export function isAuthorizedSocietyAdmin(
  identity: UserIdentity | null,
  targetSocietyId: string
): boolean {
  if (!identity || !identity.isAuthenticated) {
    return false;
  }

  // Super Admin without impersonation has platform authority
  if (identity.isSuperAdmin && !identity.isImpersonating) {
    return true;
  }

  // If impersonating, must match target society and hold an admin role
  if (identity.isImpersonating) {
    if (identity.impersonationSession?.target_society_id !== targetSocietyId) {
      return false;
    }
    const role = identity.currentRole;
    return role !== null && SOCIETY_ADMIN_ROLES.includes(role);
  }

  // Regular user must match target society context
  if (identity.currentSociety?.id !== targetSocietyId) {
    // Also verify if caller has an active admin membership in target society
    const hasMembership = identity.availableSocieties?.some(
      (m) => m.society_id === targetSocietyId && m.status === "ACTIVE" && SOCIETY_ADMIN_ROLES.includes(m.role_id)
    );
    if (!hasMembership) {
      return false;
    }
  }

  const role = identity.currentRole;
  return role !== null && SOCIETY_ADMIN_ROLES.includes(role);
}

/**
 * Checks if caller has privileges to assign/modify roles in targetSocietyId.
 * Only SUPER_ADMIN (non-impersonating), SOCIETY_ADMIN, and SECRETARY are authorized.
 */
export function canManageRoles(
  identity: UserIdentity | null,
  targetSocietyId: string
): boolean {
  if (!isAuthorizedSocietyAdmin(identity, targetSocietyId)) {
    return false;
  }

  if (!identity) return false;

  if (identity.isSuperAdmin && !identity.isImpersonating) {
    return true;
  }

  const role = identity.currentRole;
  return role !== null && ROLE_MANAGEMENT_ROLES.includes(role);
}

export interface ValidateRoleChangeParams {
  identity: UserIdentity | null;
  targetSocietyId: string;
  targetMember: {
    user_id: string;
    society_id: string;
    role_id: RoleId;
    status: MembershipStatus;
  } | null;
  newRole?: string;
  newStatus?: string;
}

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  statusCode: number;
}

export function validateRoleChange(params: ValidateRoleChangeParams): ValidationResult {
  const { identity, targetSocietyId, targetMember, newRole, newStatus } = params;

  // 1. Authentication & Management Authorization
  if (!identity || !identity.isAuthenticated) {
    return { isValid: false, error: "Authentication required.", statusCode: 401 };
  }

  if (!canManageRoles(identity, targetSocietyId)) {
    return {
      isValid: false,
      error: "Forbidden: Administrator privileges required to manage roles.",
      statusCode: 403,
    };
  }

  // 2. Member exists
  if (!targetMember) {
    return { isValid: false, error: "Member not found in this society.", statusCode: 404 };
  }

  // 3. Tenant Boundary Check
  if (targetMember.society_id !== targetSocietyId) {
    return {
      isValid: false,
      error: "Tenant boundary violation: Member does not belong to this society.",
      statusCode: 403,
    };
  }

  // 4. Self-Escalation & Self-Status Manipulation Prevention
  const callerUserId = identity.effectiveUser.id;
  if (callerUserId === targetMember.user_id) {
    if (newRole && newRole !== targetMember.role_id) {
      return {
        isValid: false,
        error: "Privilege Escalation Prevention: You cannot modify your own assigned role.",
        statusCode: 403,
      };
    }
    if (newStatus && newStatus !== targetMember.status) {
      return {
        isValid: false,
        error: "Self-Modification Prevention: You cannot modify your own membership status.",
        statusCode: 403,
      };
    }
  }

  // 5. SUPER_ADMIN Platform Role Protection
  if (newRole === "SUPER_ADMIN") {
    return {
      isValid: false,
      error: "Invalid operation: SUPER_ADMIN is a platform role and cannot be assigned in a society.",
      statusCode: 403,
    };
  }

  // 6. Whitelist Role Validation
  if (newRole && !ALLOWED_ASSIGNABLE_ROLES.includes(newRole as RoleId)) {
    return {
      isValid: false,
      error: `Invalid role '${newRole}'. Allowed roles: ${ALLOWED_ASSIGNABLE_ROLES.join(", ")}`,
      statusCode: 400,
    };
  }

  // 7. Whitelist Status Validation
  if (newStatus && !VALID_MEMBERSHIP_STATUSES.includes(newStatus as MembershipStatus)) {
    return {
      isValid: false,
      error: `Invalid status '${newStatus}'. Allowed statuses: ${VALID_MEMBERSHIP_STATUSES.join(", ")}`,
      statusCode: 400,
    };
  }

  return { isValid: true, statusCode: 200 };
}

export interface ValidateMemberRemovalParams {
  identity: UserIdentity | null;
  targetSocietyId: string;
  targetMember: {
    user_id: string;
    society_id: string;
  } | null;
}

export function validateMemberRemoval(params: ValidateMemberRemovalParams): ValidationResult {
  const { identity, targetSocietyId, targetMember } = params;

  if (!identity || !identity.isAuthenticated) {
    return { isValid: false, error: "Authentication required.", statusCode: 401 };
  }

  if (!canManageRoles(identity, targetSocietyId)) {
    return {
      isValid: false,
      error: "Forbidden: Administrator authorization required to remove members.",
      statusCode: 403,
    };
  }

  if (!targetMember) {
    return { isValid: false, error: "Member not found in this society.", statusCode: 404 };
  }

  if (targetMember.society_id !== targetSocietyId) {
    return {
      isValid: false,
      error: "Tenant boundary violation: Member does not belong to this society.",
      statusCode: 403,
    };
  }

  // Administrators cannot remove themselves
  if (targetMember.user_id === identity.effectiveUser.id) {
    return {
      isValid: false,
      error: "Invalid action: Administrators cannot remove their own society membership.",
      statusCode: 400,
    };
  }

  return { isValid: true, statusCode: 200 };
}

export const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface ValidateMemberQueryParams {
  identity: UserIdentity | null;
  targetSocietyId: string;
  page?: string | number | null;
  pageSize?: string | number | null;
  search?: string | null;
  role?: string | null;
  status?: string | null;
  unitNumber?: string | null;
  buildingId?: string | null;
  wingId?: string | null;
  unitId?: string | null;
}

export interface SanitizedMemberQueryParams {
  page: number;
  pageSize: number;
  search?: string;
  role?: RoleId;
  status?: MembershipStatus;
  unitNumber?: string;
  buildingId?: string;
  wingId?: string;
  unitId?: string;
}

export function validateMemberQuery(
  params: ValidateMemberQueryParams
): { isValid: boolean; error?: string; statusCode: number; query?: SanitizedMemberQueryParams } {
  const { identity, targetSocietyId } = params;

  if (!identity || !identity.isAuthenticated) {
    return { isValid: false, error: "Authentication required.", statusCode: 401 };
  }

  if (!isAuthorizedSocietyAdmin(identity, targetSocietyId)) {
    return {
      isValid: false,
      error: "Unauthorized: Society administrative privileges required.",
      statusCode: 403,
    };
  }

  // Parse page: default 1, min 1
  let parsedPage = 1;
  if (params.page !== undefined && params.page !== null) {
    const p = parseInt(String(params.page), 10);
    if (!isNaN(p) && p > 0) {
      parsedPage = p;
    }
  }

  // Parse pageSize: default 25, min 1, max 100
  let parsedPageSize = 25;
  if (params.pageSize !== undefined && params.pageSize !== null) {
    const ps = parseInt(String(params.pageSize), 10);
    if (!isNaN(ps) && ps > 0) {
      parsedPageSize = Math.min(ps, 100);
    }
  }

  const query: SanitizedMemberQueryParams = {
    page: parsedPage,
    pageSize: parsedPageSize,
  };

  if (params.search && typeof params.search === "string") {
    const trimmed = params.search.trim();
    if (trimmed.length > 100) {
      return {
        isValid: false,
        error: "Search query exceeds maximum allowed length of 100 characters.",
        statusCode: 400,
      };
    }
    if (trimmed.length > 0) {
      query.search = trimmed;
    }
  }

  if (params.role && typeof params.role === "string" && params.role.trim()) {
    const r = params.role.trim();
    if (ALLOWED_ASSIGNABLE_ROLES.includes(r as RoleId)) {
      query.role = r as RoleId;
    }
  }

  if (params.status && typeof params.status === "string" && params.status.trim()) {
    const s = params.status.trim();
    if (VALID_MEMBERSHIP_STATUSES.includes(s as MembershipStatus)) {
      query.status = s as MembershipStatus;
    }
  }

  if (params.unitNumber && typeof params.unitNumber === "string" && params.unitNumber.trim()) {
    query.unitNumber = params.unitNumber.trim();
  }

  // Validate buildingId UUID if provided
  if (params.buildingId !== undefined && params.buildingId !== null && String(params.buildingId).trim() !== "") {
    const bId = String(params.buildingId).trim();
    if (!UUID_REGEX.test(bId)) {
      return {
        isValid: false,
        error: "Invalid buildingId: must be a valid UUID.",
        statusCode: 400,
      };
    }
    query.buildingId = bId;
  }

  // Validate wingId UUID if provided
  if (params.wingId !== undefined && params.wingId !== null && String(params.wingId).trim() !== "") {
    const wId = String(params.wingId).trim();
    if (!UUID_REGEX.test(wId)) {
      return {
        isValid: false,
        error: "Invalid wingId: must be a valid UUID.",
        statusCode: 400,
      };
    }
    query.wingId = wId;
  }

  // Validate unitId UUID if provided
  if (params.unitId !== undefined && params.unitId !== null && String(params.unitId).trim() !== "") {
    const uId = String(params.unitId).trim();
    if (!UUID_REGEX.test(uId)) {
      return {
        isValid: false,
        error: "Invalid unitId: must be a valid UUID.",
        statusCode: 400,
      };
    }
    query.unitId = uId;
  }

  return { isValid: true, statusCode: 200, query };
}

export interface ValidateMemberStatusChangeParams {
  identity: UserIdentity | null;
  targetSocietyId: string;
  targetMember: {
    user_id: string;
    society_id: string;
    role_id: RoleId;
    status: MembershipStatus;
  } | null;
  newStatus: string;
}

export function validateMemberStatusChange(params: ValidateMemberStatusChangeParams): ValidationResult {
  const { identity, targetSocietyId, targetMember, newStatus } = params;

  // 1. Authentication & Management Authorization
  if (!identity || !identity.isAuthenticated) {
    return { isValid: false, error: "Authentication required.", statusCode: 401 };
  }

  if (!canManageRoles(identity, targetSocietyId)) {
    return {
      isValid: false,
      error: "Forbidden: Administrator privileges required to manage member status.",
      statusCode: 403,
    };
  }

  // 2. Member exists
  if (!targetMember) {
    return { isValid: false, error: "Member not found in this society.", statusCode: 404 };
  }

  // 3. Tenant Boundary Check
  if (targetMember.society_id !== targetSocietyId) {
    return {
      isValid: false,
      error: "Tenant boundary violation: Member does not belong to this society.",
      statusCode: 403,
    };
  }

  // 4. Self-Status Modification Prevention
  const callerUserId = identity.effectiveUser.id;
  if (callerUserId === targetMember.user_id) {
    return {
      isValid: false,
      error: "Self-Modification Prevention: You cannot modify your own membership status.",
      statusCode: 403,
    };
  }

  // 5. Status Validation
  if (!VALID_MEMBERSHIP_STATUSES.includes(newStatus as MembershipStatus)) {
    return {
      isValid: false,
      error: `Invalid status '${newStatus}'. Allowed statuses: ${VALID_MEMBERSHIP_STATUSES.join(", ")}`,
      statusCode: 400,
    };
  }

  // 6. Cannot transition an existing member to INVITED
  if (newStatus === "INVITED" && targetMember.status !== "INVITED") {
    return {
      isValid: false,
      error: "Invalid transition: Existing members cannot be transitioned to INVITED status.",
      statusCode: 400,
    };
  }

  return { isValid: true, statusCode: 200 };
}

export interface ValidateUnitAssociationParams {
  identity: UserIdentity | null;
  targetSocietyId: string;
  targetMember: {
    user_id: string;
    society_id: string;
  } | null;
  targetUnit?: {
    id: string;
    society_id: string;
    unit_number: string;
  } | null;
  unitId?: string | null;
  unitNumber?: string | null;
}

export function validateUnitAssociation(params: ValidateUnitAssociationParams): ValidationResult {
  const { identity, targetSocietyId, targetMember, targetUnit, unitId, unitNumber } = params;

  if (!identity || !identity.isAuthenticated) {
    return { isValid: false, error: "Authentication required.", statusCode: 401 };
  }

  if (!isAuthorizedSocietyAdmin(identity, targetSocietyId)) {
    return {
      isValid: false,
      error: "Forbidden: Administrator authorization required to associate units.",
      statusCode: 403,
    };
  }

  if (!targetMember) {
    return { isValid: false, error: "Member not found in this society.", statusCode: 404 };
  }

  if (targetMember.society_id !== targetSocietyId) {
    return {
      isValid: false,
      error: "Tenant boundary violation: Member does not belong to this society.",
      statusCode: 403,
    };
  }

  // If unassigning unit (both null/empty or explicit null)
  const isUnassigning = !unitId && (!unitNumber || unitNumber.trim() === "");
  if (isUnassigning) {
    return { isValid: true, statusCode: 200 };
  }

  // If unitId is provided, validate UUID format
  if (unitId && !UUID_REGEX.test(unitId)) {
    return { isValid: false, error: "Invalid unitId: must be a valid UUID.", statusCode: 400 };
  }

  // If targetUnit record is evaluated
  if (targetUnit) {
    if (targetUnit.society_id !== targetSocietyId) {
      return {
        isValid: false,
        error: "Tenant boundary violation: Target unit belongs to a different society.",
        statusCode: 403,
      };
    }
  }

  return { isValid: true, statusCode: 200 };
}

export interface ValidateRelationshipAccessParams {
  identity: UserIdentity | null;
  targetSocietyId: string;
  targetMember: {
    user_id: string;
    society_id: string;
  } | null;
}

export function validateRelationshipAccess(params: ValidateRelationshipAccessParams): ValidationResult {
  const { identity, targetSocietyId, targetMember } = params;

  if (!identity || !identity.isAuthenticated) {
    return { isValid: false, error: "Authentication required.", statusCode: 401 };
  }

  if (!targetMember) {
    return { isValid: false, error: "Member not found in this society.", statusCode: 404 };
  }

  if (targetMember.society_id !== targetSocietyId) {
    return {
      isValid: false,
      error: "Tenant boundary violation: Member does not belong to this society.",
      statusCode: 403,
    };
  }

  const isSelf = identity.effectiveUser.id === targetMember.user_id;
  const isAdmin = isAuthorizedSocietyAdmin(identity, targetSocietyId);

  if (!isAdmin && !isSelf) {
    return {
      isValid: false,
      error: "Forbidden: You are not authorized to view this member's relationships.",
      statusCode: 403,
    };
  }

  return { isValid: true, statusCode: 200 };
}

