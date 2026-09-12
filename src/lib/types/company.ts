export type CompanyRole = "COMPANY_ADMIN" | "COMPANY_MANAGER" | "COMPANY_OPERATIONS";

export type CompanyStatus = "ACTIVE" | "INACTIVE";

export type CompanyMemberStatus = "ACTIVE" | "SUSPENDED" | "REVOKED";

export type CompanySocietyStatus = "ACTIVE" | "INACTIVE";

export type CompanySocietyAccessStatus = "ACTIVE" | "SUSPENDED" | "REVOKED";

export type CompanyStaffAssignmentType =
  | "PROPERTY_MANAGER"
  | "FACILITY_STAFF"
  | "ACCOUNTANT"
  | "OPERATIONS"
  | "SUPERVISOR"
  | "OTHER";

export type CompanyStaffAssignmentStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED" | "TERMINATED";

export interface ManagementCompany {
  id: string;
  name: string;
  legal_name?: string | null;
  code: string;
  status: CompanyStatus;
  contact_email?: string | null;
  contact_phone?: string | null;
  address?: Record<string, unknown> | null;
  logo_url?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ManagementCompanyMember {
  id: string;
  management_company_id: string;
  user_id: string;
  role: CompanyRole;
  status: CompanyMemberStatus;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  profile?: {
    id: string;
    email: string;
    full_name: string;
    display_name?: string | null;
    phone?: string | null;
    avatar_url?: string | null;
  };
}

export interface ManagementCompanySociety {
  id: string;
  management_company_id: string;
  society_id: string;
  status: CompanySocietyStatus;
  assigned_at: string;
  assigned_by?: string | null;
  removed_at?: string | null;
  created_at: string;
  updated_at: string;
  society?: {
    id: string;
    name: string;
    code: string;
    status: string;
    city?: string | null;
    state?: string | null;
    address_line1?: string | null;
  };
}

export interface ManagementCompanySocietyAccess {
  id: string;
  management_company_id: string;
  management_company_member_id: string;
  management_company_society_id: string;
  status: CompanySocietyAccessStatus;
  assigned_by?: string | null;
  created_at: string;
  updated_at: string;
  member?: ManagementCompanyMember;
  society_assignment?: ManagementCompanySociety;
}

export interface ManagementCompanyStaffAssignment {
  id: string;
  management_company_id: string;
  user_id: string;
  society_id: string;
  assignment_type: CompanyStaffAssignmentType;
  status: CompanyStaffAssignmentStatus;
  start_date: string;
  end_date?: string | null;
  assigned_by?: string | null;
  created_at: string;
  updated_at: string;
  profile?: {
    id: string;
    email: string;
    full_name: string;
    phone?: string | null;
  };
  society?: {
    id: string;
    name: string;
    code: string;
  };
}

export interface CompanyDashboardMetrics {
  managedSocietiesCount: number;
  activeSocietiesCount: number;
  accessibleSocietiesCount: number;
  totalBuildingsCount: number;
  totalUnitsCount: number;
  totalActiveMembersCount: number;
  openComplaintsCount: number;
  upcomingEventsCount: number;
  pendingAccessRequestsCount: number;
  upcomingMeetingsCount: number;
}

export const COMPANY_ROLE_PRECEDENCE: Record<CompanyRole, number> = {
  COMPANY_ADMIN: 90,
  COMPANY_MANAGER: 70,
  COMPANY_OPERATIONS: 50,
};

export const COMPANY_PERMISSIONS = {
  COMPANY_VIEW: "company.view",
  COMPANY_MANAGE: "company.manage",
  COMPANY_SOCIETIES_VIEW: "company.societies.view",
  COMPANY_SOCIETIES_MANAGE: "company.societies.manage",
  COMPANY_MEMBERS_VIEW: "company.members.view",
  COMPANY_MEMBERS_MANAGE: "company.members.manage",
  COMPANY_STAFF_VIEW: "company.staff.view",
  COMPANY_STAFF_MANAGE: "company.staff.manage",
  COMPANY_ANALYTICS_VIEW: "company.analytics.view",
} as const;

export const COMPANY_ROLE_PERMISSIONS: Record<CompanyRole, string[]> = {
  COMPANY_ADMIN: [
    COMPANY_PERMISSIONS.COMPANY_VIEW,
    COMPANY_PERMISSIONS.COMPANY_MANAGE,
    COMPANY_PERMISSIONS.COMPANY_SOCIETIES_VIEW,
    COMPANY_PERMISSIONS.COMPANY_SOCIETIES_MANAGE,
    COMPANY_PERMISSIONS.COMPANY_MEMBERS_VIEW,
    COMPANY_PERMISSIONS.COMPANY_MEMBERS_MANAGE,
    COMPANY_PERMISSIONS.COMPANY_STAFF_VIEW,
    COMPANY_PERMISSIONS.COMPANY_STAFF_MANAGE,
    COMPANY_PERMISSIONS.COMPANY_ANALYTICS_VIEW,
  ],
  COMPANY_MANAGER: [
    COMPANY_PERMISSIONS.COMPANY_VIEW,
    COMPANY_PERMISSIONS.COMPANY_SOCIETIES_VIEW,
    COMPANY_PERMISSIONS.COMPANY_STAFF_VIEW,
    COMPANY_PERMISSIONS.COMPANY_STAFF_MANAGE,
    COMPANY_PERMISSIONS.COMPANY_ANALYTICS_VIEW,
  ],
  COMPANY_OPERATIONS: [
    COMPANY_PERMISSIONS.COMPANY_VIEW,
    COMPANY_PERMISSIONS.COMPANY_SOCIETIES_VIEW,
    COMPANY_PERMISSIONS.COMPANY_STAFF_VIEW,
  ],
};

