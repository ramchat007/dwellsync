export type RoleId =
  | "SUPER_ADMIN"
  | "SOCIETY_ADMIN"
  | "COMMITTEE_MEMBER"
  | "SECRETARY"
  | "TREASURER"
  | "MANAGER"
  | "RESIDENT"
  | "OWNER"
  | "TENANT"
  | "SECURITY"
  | "STAFF"
  | "VENDOR"
  | "AUDITOR";

export type SocietyType =
  | "COOPERATIVE_HOUSING"
  | "APARTMENT_SOCIETY"
  | "GATED_COMMUNITY"
  | "VILLA_COMMUNITY"
  | "CONDOMINIUM"
  | "PROPERTY_MANAGEMENT"
  | "OTHER";

export type SocietyStatus = "ONBOARDING" | "ACTIVE" | "SUSPENDED" | "ARCHIVED";

export type BuildingStatus = "ACTIVE" | "INACTIVE" | "UNDER_MAINTENANCE";

export type WingStatus = "ACTIVE" | "INACTIVE";

export type FloorStatus = "ACTIVE" | "INACTIVE";

export type UnitType =
  | "1_BHK"
  | "2_BHK"
  | "3_BHK"
  | "4_BHK"
  | "PENTHOUSE"
  | "SHOP"
  | "OFFICE"
  | "PARKING"
  | "OTHER";

export type UnitStatus =
  | "ACTIVE"
  | "VACANT"
  | "OCCUPIED"
  | "UNDER_MAINTENANCE"
  | "INACTIVE";

export type MembershipStatus = "INVITED" | "ACTIVE" | "SUSPENDED" | "REMOVED";

export type ProfileStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED";

export type ImpersonationStatus = "ACTIVE" | "TERMINATED" | "EXPIRED";

export type OwnershipType = "PRIMARY" | "JOINT" | "INHERITED" | "CORPORATE" | "OTHER";
export type OwnershipStatus = "ACTIVE" | "HISTORICAL" | "DISPUTED";

export type OccupancyType = "OWNER_OCCUPIED" | "TENANT_OCCUPIED" | "FAMILY_OCCUPIED";
export type OccupancyStatus = "ACTIVE" | "EXPIRED" | "TERMINATED";

export type FamilyRelationship = "SPOUSE" | "CHILD" | "PARENT" | "SIBLING" | "OTHER";

export type InvitationStatus = "PENDING" | "ACCEPTED" | "EXPIRED" | "REVOKED";

export type AuditAction =
  | "SUPER_ADMIN_LOGIN"
  | "SUPER_ADMIN_LOGOUT"
  | "SUPER_ADMIN_BOOTSTRAP"
  | "IMPERSONATION_STARTED"
  | "IMPERSONATION_ENDED"
  | "SOCIETY_CREATED"
  | "SOCIETY_UPDATED"
  | "SOCIETY_ACTIVATED"
  | "SOCIETY_SUSPENDED"
  | "SOCIETY_STATUS_CHANGED"
  | "PROFILE_UPDATED"
  | "MEMBERSHIP_CREATED"
  | "MEMBERSHIP_UPDATED"
  | "MEMBERSHIP_REMOVED"
  | "MEMBER_INVITED"
  | "MEMBER_CREATED"
  | "MEMBER_ROLE_CHANGED"
  | "MEMBER_SUSPENDED"
  | "BUILDING_CREATED"
  | "BUILDING_UPDATED"
  | "BUILDING_DELETED"
  | "WING_CREATED"
  | "WING_UPDATED"
  | "WING_DELETED"
  | "FLOOR_CREATED"
  | "FLOOR_UPDATED"
  | "FLOOR_DELETED"
  | "UNIT_CREATED"
  | "UNIT_UPDATED"
  | "UNIT_DELETED"
  | "UNITS_BULK_GENERATED"
  | "OWNER_ADDED"
  | "OWNER_REMOVED"
  | "TENANT_ADDED"
  | "TENANT_REMOVED";

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  display_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  alternate_phone?: string | null;
  status: ProfileStatus;
  created_at: string;
  updated_at: string;
}

export interface Society {
  id: string;
  name: string;
  code: string;
  registration_number?: string | null;
  society_type: SocietyType;
  logo_url?: string | null;
  address?: string | null;
  address_line_1?: string | null;
  address_line_2?: string | null;
  landmark?: string | null;
  city?: string | null;
  district?: string | null;
  state?: string | null;
  pincode?: string | null;
  country: string;
  contact_email?: string | null;
  contact_phone?: string | null;
  website?: string | null;
  timezone: string;
  currency: string;
  status: SocietyStatus;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
  updated_by?: string | null;
}

export interface Building {
  id: string;
  society_id: string;
  name: string;
  code: string;
  description?: string | null;
  number_of_floors: number;
  status: BuildingStatus;
  created_at: string;
  updated_at: string;
}

export interface Wing {
  id: string;
  society_id: string;
  building_id: string;
  name: string;
  code: string;
  description?: string | null;
  status: WingStatus;
  created_at: string;
  updated_at: string;
}

export interface Floor {
  id: string;
  society_id: string;
  building_id: string;
  wing_id?: string | null;
  name: string;
  floor_number: number;
  display_order: number;
  status: FloorStatus;
  created_at: string;
  updated_at: string;
}

export interface Unit {
  id: string;
  society_id: string;
  building_id: string;
  wing_id?: string | null;
  floor_id?: string | null;
  unit_number: string;
  unit_type: UnitType;
  area_sqft?: number | null;
  carpet_area_sqft?: number | null;
  built_up_area_sqft?: number | null;
  status: UnitStatus;
  created_at: string;
  updated_at: string;
  building?: Building;
  wing?: Wing;
  floor?: Floor;
}

export interface UnitOwner {
  id: string;
  society_id: string;
  unit_id: string;
  user_id: string;
  is_primary: boolean;
  ownership_percentage: number;
  ownership_type: OwnershipType;
  start_date?: string | null;
  end_date?: string | null;
  status: OwnershipStatus;
  created_at: string;
  updated_at: string;
  profile?: Profile;
  unit?: Unit;
}

export interface UnitOccupancy {
  id: string;
  society_id: string;
  unit_id: string;
  user_id: string;
  occupancy_type: OccupancyType;
  lease_start?: string | null;
  lease_end?: string | null;
  is_primary_tenant: boolean;
  status: OccupancyStatus;
  created_at: string;
  updated_at: string;
  profile?: Profile;
  unit?: Unit;
}

export interface FamilyMember {
  id: string;
  society_id: string;
  unit_id: string;
  primary_member_id: string;
  full_name: string;
  relationship: FamilyRelationship;
  phone?: string | null;
  email?: string | null;
  is_emergency_contact: boolean;
  created_at: string;
  updated_at: string;
  primary_member?: Profile;
}

export interface Invitation {
  id: string;
  society_id: string;
  email: string;
  role_id: RoleId;
  unit_id?: string | null;
  unit_number?: string | null;
  token: string;
  expires_at: string;
  accepted_at?: string | null;
  invited_by?: string | null;
  status: InvitationStatus;
  created_at: string;
  updated_at: string;
  society?: Society;
}

export interface Role {
  id: RoleId;
  name: string;
  description: string | null;
  is_platform_role: boolean;
  created_at: string;
}

export interface Permission {
  id: string;
  name: string;
  category: string;
  description: string | null;
  created_at: string;
}

export interface RolePermission {
  role_id: RoleId;
  permission_id: string;
  created_at: string;
}

export interface SocietyMembership {
  id: string;
  society_id: string;
  user_id: string;
  role_id: RoleId;
  unit_number?: string | null;
  status: MembershipStatus;
  joined_at?: string | null;
  left_at?: string | null;
  created_at: string;
  updated_at: string;
  society?: Society;
  profile?: Profile;
}

export interface PlatformAdmin {
  id: string;
  user_id: string;
  role_id: "SUPER_ADMIN";
  created_at: string;
  created_by?: string | null;
  profile?: Profile;
}

export interface ImpersonationSession {
  id: string;
  original_admin_id: string;
  target_user_id: string;
  target_society_id?: string | null;
  target_role_id?: string | null;
  session_token: string;
  status: ImpersonationStatus;
  reason?: string | null;
  started_at: string;
  ended_at?: string | null;
  created_at: string;
  original_admin?: Profile;
  target_user?: Profile;
  target_society?: Society;
}

export interface AuditLog {
  id: string;
  actor_user_id?: string | null;
  effective_user_id?: string | null;
  society_id?: string | null;
  action: AuditAction | string;
  resource_type: string;
  resource_id?: string | null;
  metadata: Record<string, unknown>;
  ip_address?: string | null;
  user_agent?: string | null;
  created_at: string;
  actor?: Profile;
  effective_user?: Profile;
  society?: Society;
}
