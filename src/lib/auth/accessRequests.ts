import { RoleId, SocietyAccessRequest, AccessRequestRole, AccessRequestStatus } from "../types/database";
import { UserIdentity } from "../types/auth";

export const ALLOWED_REQUEST_ROLES: AccessRequestRole[] = ["OWNER", "TENANT", "RESIDENT"];
export const ALLOWED_APPROVE_ROLES: RoleId[] = ["OWNER", "TENANT", "RESIDENT"];
export const SOCIETY_ADMIN_ROLES: RoleId[] = ["SOCIETY_ADMIN", "SECRETARY", "MANAGER"];

export interface ValidateSubmissionResult {
  isValid: boolean;
  error?: string;
  normalizedRole: AccessRequestRole;
  statusCode: number;
}

export function validateAccessRequestInput(params: {
  identity: UserIdentity | null;
  societyId?: string;
  societyStatus?: string;
  unitNumber?: string;
  requestedRole?: string;
  hasActiveMembership: boolean;
  hasPendingRequest: boolean;
}): ValidateSubmissionResult {
  const { identity, societyId, societyStatus, unitNumber, requestedRole, hasActiveMembership, hasPendingRequest } = params;

  if (!identity || !identity.isAuthenticated) {
    return { isValid: false, error: "Authentication required.", normalizedRole: "RESIDENT", statusCode: 401 };
  }

  if (!societyId) {
    return { isValid: false, error: "Society not found. Please select a registered society.", normalizedRole: "RESIDENT", statusCode: 400 };
  }

  if (societyStatus && societyStatus !== "ACTIVE" && societyStatus !== "ONBOARDING") {
    return { isValid: false, error: "Selected society is not accepting access requests.", normalizedRole: "RESIDENT", statusCode: 400 };
  }

  if (!unitNumber || typeof unitNumber !== "string" || !unitNumber.trim()) {
    return { isValid: false, error: "Unit number is required.", normalizedRole: "RESIDENT", statusCode: 400 };
  }

  if (hasActiveMembership) {
    return { isValid: false, error: "You are already an active member of this society.", normalizedRole: "RESIDENT", statusCode: 409 };
  }

  if (hasPendingRequest) {
    return { isValid: false, error: "You already have a pending access request for this society.", normalizedRole: "RESIDENT", statusCode: 409 };
  }

  // Strictly sanitize requested role to lowest appropriate resident role
  const rawRole = typeof requestedRole === "string" ? requestedRole.toUpperCase().trim() : "RESIDENT";
  const normalizedRole: AccessRequestRole = ALLOWED_REQUEST_ROLES.includes(rawRole as AccessRequestRole)
    ? (rawRole as AccessRequestRole)
    : "RESIDENT";

  return { isValid: true, normalizedRole, statusCode: 200 };
}

export function isAuthorizedSocietyAdmin(identity: UserIdentity, targetSocietyId: string): boolean {
  if (identity.isSuperAdmin && !identity.isImpersonating) {
    return true;
  }

  // If impersonating, must match target impersonation society
  if (identity.isImpersonating) {
    if (identity.impersonationSession?.target_society_id !== targetSocietyId) {
      return false;
    }
  }

  // Must match target society context
  if (identity.currentSociety?.id !== targetSocietyId) {
    return false;
  }

  const role = identity.currentRole;
  return role !== null && SOCIETY_ADMIN_ROLES.includes(role);
}

export interface ValidateApprovalResult {
  isValid: boolean;
  error?: string;
  assignedRole: RoleId;
  statusCode: number;
}

export function validateApprovalRules(params: {
  identity: UserIdentity;
  targetSocietyId: string;
  request: Partial<SocietyAccessRequest> | null;
  requestedRole?: string;
  hasExistingActiveMembership: boolean;
}): ValidateApprovalResult {
  const { identity, targetSocietyId, request, requestedRole, hasExistingActiveMembership } = params;

  // 1. Admin Authority Verification
  if (!isAuthorizedSocietyAdmin(identity, targetSocietyId)) {
    return {
      isValid: false,
      error: "Unauthorized. Society administrative privileges required.",
      assignedRole: "RESIDENT",
      statusCode: 403,
    };
  }

  if (!request) {
    return { isValid: false, error: "Access request not found.", assignedRole: "RESIDENT", statusCode: 404 };
  }

  // 2. Society Scope Verification
  if (request.society_id && request.society_id !== targetSocietyId) {
    return {
      isValid: false,
      error: "Access request does not belong to this society.",
      assignedRole: "RESIDENT",
      statusCode: 403,
    };
  }

  // 3. Self-Approval Prevention
  if (identity.effectiveUser?.id === request.user_id) {
    return {
      isValid: false,
      error: "Requesters cannot approve their own access request.",
      assignedRole: "RESIDENT",
      statusCode: 403,
    };
  }

  // 4. Status Check: Must be PENDING
  if (request.status !== "PENDING") {
    return {
      isValid: false,
      error: `Cannot approve request with status '${request.status}'. Only pending requests can be approved.`,
      assignedRole: "RESIDENT",
      statusCode: 400,
    };
  }

  // 5. Role Escalation Prevention: Whitelist to resident roles only
  const rawRole = requestedRole
    ? String(requestedRole).toUpperCase().trim()
    : (request.requested_role || "RESIDENT");
  const assignedRole: RoleId = ALLOWED_APPROVE_ROLES.includes(rawRole as RoleId)
    ? (rawRole as RoleId)
    : "RESIDENT";

  // 6. Duplicate Membership Check
  if (hasExistingActiveMembership) {
    return {
      isValid: true,
      error: "Applicant is already an active member of this society.",
      assignedRole,
      statusCode: 200,
    };
  }

  return { isValid: true, assignedRole, statusCode: 200 };
}

export interface ValidateRejectionResult {
  isValid: boolean;
  error?: string;
  statusCode: number;
}

export function validateRejectionRules(params: {
  identity: UserIdentity;
  targetSocietyId: string;
  request: Partial<SocietyAccessRequest> | null;
}): ValidateRejectionResult {
  const { identity, targetSocietyId, request } = params;

  if (!isAuthorizedSocietyAdmin(identity, targetSocietyId)) {
    return {
      isValid: false,
      error: "Unauthorized. Society administrative privileges required.",
      statusCode: 403,
    };
  }

  if (!request) {
    return { isValid: false, error: "Access request not found.", statusCode: 404 };
  }

  if (request.society_id && request.society_id !== targetSocietyId) {
    return {
      isValid: false,
      error: "Access request does not belong to this society.",
      statusCode: 403,
    };
  }

  if (request.status !== "PENDING") {
    return {
      isValid: false,
      error: `Cannot reject request with status '${request.status}'. Only pending requests can be rejected.`,
      statusCode: 400,
    };
  }

  return { isValid: true, statusCode: 200 };
}

export interface ValidateCancellationResult {
  isValid: boolean;
  error?: string;
  statusCode: number;
}

export function validateCancellationRules(params: {
  identity: UserIdentity;
  request: Partial<SocietyAccessRequest> | null;
}): ValidateCancellationResult {
  const { identity, request } = params;

  if (!identity || !identity.isAuthenticated) {
    return { isValid: false, error: "Authentication required.", statusCode: 401 };
  }

  if (!request) {
    return { isValid: false, error: "Access request not found.", statusCode: 404 };
  }

  // Ownership: only requester can cancel own request
  if (request.user_id !== identity.effectiveUser?.id) {
    return {
      isValid: false,
      error: "You are not authorized to cancel this access request.",
      statusCode: 403,
    };
  }

  // Status check: only PENDING requests can be cancelled
  if (request.status !== "PENDING") {
    return {
      isValid: false,
      error: `Cannot cancel request with status '${request.status}'. Only pending requests can be cancelled.`,
      statusCode: 400,
    };
  }

  return { isValid: true, statusCode: 200 };
}
