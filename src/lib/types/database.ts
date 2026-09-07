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
  | "TENANT_REMOVED"
  | "VISITOR_CREATED"
  | "VISITOR_APPROVED"
  | "VISITOR_CHECKED_IN"
  | "VISITOR_CHECKED_OUT"
  | "VISITOR_CANCELLED"
  | "COMPLAINT_CREATED"
  | "COMPLAINT_ASSIGNED"
  | "COMPLAINT_STATUS_CHANGED"
  | "COMPLAINT_RESOLVED"
  | "COMPLAINT_CLOSED"
  | "AMENITY_CREATED"
  | "AMENITY_UPDATED"
  | "AMENITY_DELETED"
  | "AMENITY_BOOKED"
  | "AMENITY_BOOKING_CANCELLED"
  | "EVENT_CREATED"
  | "EVENT_UPDATED"
  | "EVENT_CANCELLED"
  | "MEETING_SCHEDULED"
  | "MEETING_UPDATED"
  | "MEETING_COMPLETED"
  | "MEETING_CANCELLED"
  | "NOTICE_CREATED"
  | "NOTICE_UPDATED"
  | "NOTICE_ARCHIVED"
  | "DOCUMENT_UPLOADED"
  | "DOCUMENT_DELETED"
  | "MAINTENANCE_CONFIG_CREATED"
  | "MAINTENANCE_CONFIG_UPDATED"
  | "BILLING_CYCLE_CREATED"
  | "INVOICES_BULK_GENERATED"
  | "INVOICE_STATUS_UPDATED"
  | "INVOICE_CANCELLED"
  | "PAYMENT_RECORDED"
  | "RECEIPT_GENERATED"
  | "RECEIPT_CANCELLED"
  | "NOTIFICATION_CREATED"
  | "NOTIFICATION_SENT"
  | "NOTIFICATION_FAILED"
  | "NOTIFICATION_READ"
  | "NOTIFICATION_BROADCAST"
  | "NOTIFICATION_PREFERENCES_UPDATED"
  | "COMMITTEE_CREATED"
  | "COMMITTEE_UPDATED"
  | "COMMITTEE_DISSOLVED"
  | "COMMITTEE_MEMBER_APPOINTED"
  | "COMMITTEE_MEMBER_UPDATED"
  | "COMMITTEE_MEMBER_RESIGNED"
  | "COMMITTEE_MEMBER_REMOVED";

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
  super_built_up_area_sqft?: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  balconies?: number | null;
  parking_slots?: number | null;
  monthly_maintenance_override?: number | null;
  intercom_number?: string | null;
  meter_number_electricity?: string | null;
  meter_number_gas?: string | null;
  meter_number_water?: string | null;
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
  primary_member_id?: string;
  primary_resident_user_id?: string;
  full_name: string;
  relationship: FamilyRelationship;
  phone?: string | null;
  email?: string | null;
  is_minor?: boolean;
  gate_access_allowed?: boolean;
  is_emergency_contact?: boolean;
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

export type NoticeCategory = "GENERAL" | "MAINTENANCE" | "URGENT" | "EVENT" | "BILLING";
export type NoticePriority = "LOW" | "MEDIUM" | "HIGH" | "EMERGENCY";
export type NoticeStatus = "PUBLISHED" | "DRAFT" | "ARCHIVED";

export interface Notice {
  id: string;
  society_id: string;
  title: string;
  description: string;
  category: NoticeCategory;
  priority: NoticePriority;
  published_by: string;
  published_at: string;
  expires_at?: string | null;
  attachment_url?: string | null;
  status: NoticeStatus;
  created_at: string;
  updated_at: string;
  publisher?: Profile;
}

export type DocumentCategory =
  | "SOCIETY_BYLAWS"
  | "AGM_MINUTES"
  | "FINANCIAL_REPORT"
  | "FORMS_TEMPLATES"
  | "RULES_REGULATIONS";

export type DocumentVisibility = "ALL_RESIDENTS" | "OWNERS_ONLY" | "COMMITTEE_ONLY";

export interface SocietyDocument {
  id: string;
  society_id: string;
  title: string;
  description?: string | null;
  category: DocumentCategory;
  file_url: string;
  file_type?: string | null;
  file_size_kb?: number | null;
  visibility: DocumentVisibility;
  uploaded_by: string;
  created_at: string;
  updated_at: string;
  uploader?: Profile;
}

export interface ProfilePrivacySettings {
  id: string;
  user_id: string;
  profile_visible_in_directory: boolean;
  phone_visible_in_directory: boolean;
  email_visible_in_directory: boolean;
  allow_neighbor_chat: boolean;
  created_at: string;
  updated_at: string;
}

export type VisitorPurpose = "GUEST" | "DELIVERY" | "CAB" | "SERVICE" | "FAMILY" | "OTHER";

export type VisitorStatus = "EXPECTED" | "CHECKED_IN" | "CHECKED_OUT" | "CANCELLED" | "DENIED";

export interface Visitor {
  id: string;
  society_id: string;
  unit_id: string;
  created_by: string;
  visitor_name: string;
  visitor_phone?: string | null;
  purpose: VisitorPurpose;
  vehicle_number?: string | null;
  pass_code: string;
  expected_arrival?: string | null;
  valid_until?: string | null;
  status: VisitorStatus;
  check_in_at?: string | null;
  check_out_at?: string | null;
  check_in_by?: string | null;
  check_out_by?: string | null;
  gate_number?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  unit?: Unit;
  creator?: Profile;
  check_in_guard?: Profile;
  check_out_guard?: Profile;
}

// ==========================================
// PHASE 8: SOCIETY OPERATIONS TYPES
// ==========================================

export type ComplaintCategory =
  | "ELECTRICAL"
  | "PLUMBING"
  | "ELEVATOR"
  | "COMMON_AREA"
  | "SECURITY"
  | "NOISE"
  | "CARPENTRY"
  | "CLEANLINESS"
  | "OTHER";

export type ComplaintPriority = "LOW" | "MEDIUM" | "HIGH" | "EMERGENCY";

export type ComplaintStatus =
  | "SUBMITTED"
  | "ASSIGNED"
  | "IN_PROGRESS"
  | "RESOLVED"
  | "CLOSED";

export interface Complaint {
  id: string;
  society_id: string;
  unit_id?: string | null;
  created_by: string;
  title: string;
  description: string;
  category: ComplaintCategory;
  priority: ComplaintPriority;
  status: ComplaintStatus;
  assigned_to?: string | null;
  resolved_at?: string | null;
  closed_at?: string | null;
  resolution_notes?: string | null;
  created_at: string;
  updated_at: string;
  unit?: Unit;
  creator?: Profile;
  assignee?: Profile;
}

export type AmenityCategory =
  | "CLUBHOUSE"
  | "GYM"
  | "SWIMMING_POOL"
  | "TENNIS_COURT"
  | "COMMUNITY_HALL"
  | "ROOFTOP"
  | "BADMINTON_COURT"
  | "OTHER";

export type AmenityStatus = "AVAILABLE" | "MAINTENANCE" | "CLOSED";

export interface Amenity {
  id: string;
  society_id: string;
  name: string;
  description?: string | null;
  category: AmenityCategory;
  capacity?: number | null;
  operating_hours_start?: string | null;
  operating_hours_end?: string | null;
  slot_duration_minutes?: number | null;
  rules?: string | null;
  status: AmenityStatus;
  created_at: string;
  updated_at: string;
}

export type BookingStatus = "CONFIRMED" | "CANCELLED" | "COMPLETED";

export interface AmenityBooking {
  id: string;
  society_id: string;
  amenity_id: string;
  unit_id?: string | null;
  booked_by: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  status: BookingStatus;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  amenity?: Amenity;
  unit?: Unit;
  booker?: Profile;
}

export type EventCategory =
  | "CELEBRATION"
  | "MEETING"
  | "WORKSHOP"
  | "SPORTS"
  | "CULTURAL"
  | "GENERAL";

export type EventStatus = "UPCOMING" | "COMPLETED" | "CANCELLED";

export type EventVisibility = "ALL_RESIDENTS" | "COMMITTEE_ONLY";

export interface SocietyEvent {
  id: string;
  society_id: string;
  title: string;
  description: string;
  category: EventCategory;
  event_date: string;
  start_time?: string | null;
  end_time?: string | null;
  location: string;
  organizer_name?: string | null;
  organizer_id?: string | null;
  visibility: EventVisibility;
  status: EventStatus;
  created_at: string;
  updated_at: string;
  organizer?: Profile;
}

export type MeetingType =
  | "AGM"
  | "EGM"
  | "MANAGING_COMMITTEE"
  | "VENDOR"
  | "GENERAL";

export type MeetingStatus =
  | "SCHEDULED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED";

export type MeetingLocationType = "PHYSICAL" | "ONLINE" | "HYBRID";

export interface SocietyMeeting {
  id: string;
  society_id: string;
  title: string;
  agenda?: string | null;
  meeting_type: MeetingType;
  location_type: MeetingLocationType;
  location_details?: string | null;
  meeting_link?: string | null;
  scheduled_at: string;
  duration_minutes?: number | null;
  status: MeetingStatus;
  minutes_document_id?: string | null;
  committee_id?: string | null;
  quorum_required?: number | null;
  quorum_met?: boolean | null;
  presiding_officer_id?: string | null;
  organized_by: string;
  created_at: string;
  updated_at: string;
  organizer?: Profile;
  presiding_officer?: Profile;
  minutes_document?: SocietyDocument;
}

// ==========================================
// PHASE 9: MAINTENANCE & BILLING MODELS
// ==========================================

export type MaintenanceChargeType = "FLAT_RATE" | "AREA_BASED" | "UNIT_TYPE_BASED";

export type MaintenanceFrequency =
  | "MONTHLY"
  | "QUARTERLY"
  | "BIANNUAL"
  | "ANNUAL"
  | "ONE_TIME";

export interface MaintenanceConfiguration {
  id: string;
  society_id: string;
  name: string;
  description?: string | null;
  charge_type: MaintenanceChargeType;
  rate: number;
  unit_type_rates?: Record<string, number> | null;
  frequency: MaintenanceFrequency;
  effective_from: string;
  effective_to?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type BillingCycleStatus = "DRAFT" | "GENERATED" | "CLOSED" | "CANCELLED";

export interface BillingCycle {
  id: string;
  society_id: string;
  name: string;
  period_start: string;
  period_end: string;
  due_date: string;
  status: BillingCycleStatus;
  notes?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  creator?: Profile;
}

export type InvoiceStatus =
  | "UNPAID"
  | "PARTIALLY_PAID"
  | "PAID"
  | "OVERDUE"
  | "CANCELLED";

export interface InvoiceLineItem {
  description: string;
  amount: number;
  category?: string;
}

export interface Invoice {
  id: string;
  society_id: string;
  unit_id: string;
  billing_cycle_id?: string | null;
  charge_config_id?: string | null;
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  subtotal: number;
  adjustments: number;
  total_amount: number;
  amount_paid: number;
  balance_due: number;
  status: InvoiceStatus;
  line_items: InvoiceLineItem[];
  notes?: string | null;
  created_at: string;
  updated_at: string;
  unit?: Unit;
  billing_cycle?: BillingCycle;
  charge_config?: MaintenanceConfiguration;
}

export type PaymentMethod =
  | "CASH"
  | "CHEQUE"
  | "BANK_TRANSFER"
  | "UPI"
  | "CARD"
  | "OTHER";

export type PaymentStatus = "COMPLETED" | "PENDING" | "FAILED" | "CANCELLED";

export interface Payment {
  id: string;
  society_id: string;
  invoice_id: string;
  unit_id: string;
  amount: number;
  payment_date: string;
  payment_method: PaymentMethod;
  reference_number?: string | null;
  status: PaymentStatus;
  recorded_by: string;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  invoice?: Invoice;
  unit?: Unit;
  recorder?: Profile;
}

export interface Receipt {
  id: string;
  society_id: string;
  invoice_id: string;
  payment_id: string;
  unit_id: string;
  receipt_number: string;
  amount: number;
  receipt_date: string;
  issued_by: string;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  invoice?: Invoice;
  payment?: Payment;
  unit?: Unit;
  issuer?: Profile;
}

// ==========================================
// PHASE 10: COMMUNICATION & NOTIFICATION MODELS
// ==========================================

export type DbNotificationCategory =
  | "SECURITY"
  | "BILLING"
  | "COMPLAINTS"
  | "NOTICES"
  | "AMENITIES"
  | "EVENTS"
  | "GENERAL";

export interface Notification {
  id: string;
  society_id: string;
  recipient_id: string;
  actor_id?: string | null;
  category: DbNotificationCategory;
  type: string;
  title: string;
  body: string;
  action_url?: string | null;
  is_read: boolean;
  read_at?: string | null;
  dedup_key?: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  recipient?: Profile;
  actor?: Profile;
}

export interface NotificationPreference {
  id: string;
  user_id: string;
  society_id: string;
  category: DbNotificationCategory;
  email_enabled: boolean;
  sms_enabled: boolean;
  whatsapp_enabled: boolean;
  in_app_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export type DbDeliveryChannel = "IN_APP" | "EMAIL" | "SMS" | "WHATSAPP";
export type DbDeliveryStatus =
  | "QUEUED"
  | "ACCEPTED"
  | "DELIVERED"
  | "FAILED"
  | "RETRYING"
  | "CANCELLED";

export interface NotificationDelivery {
  id: string;
  notification_id: string;
  channel: DbDeliveryChannel;
  provider: string;
  provider_message_id?: string | null;
  status: DbDeliveryStatus;
  error_message?: string | null;
  attempts: number;
  created_at: string;
  updated_at: string;
  notification?: Notification;
}

// ==========================================
// PHASE 11: GOVERNANCE & ADMINISTRATION MODELS
// ==========================================

export type CommitteeType =
  | "MANAGING_COMMITTEE"
  | "SUB_COMMITTEE"
  | "GRIEVANCE_COMMITTEE"
  | "ELECTION_COMMITTEE"
  | "OTHER";

export type CommitteeStatus = "ACTIVE" | "EXPIRED" | "DISSOLVED";

export type CommitteeMemberDesignation =
  | "PRESIDENT"
  | "VICE_PRESIDENT"
  | "CHAIRMAN"
  | "SECRETARY"
  | "JOINT_SECRETARY"
  | "TREASURER"
  | "JOINT_TREASURER"
  | "EXECUTIVE_MEMBER"
  | "INVITEE";

export type CommitteeMemberStatus = "ACTIVE" | "RESIGNED" | "REMOVED" | "EXPIRED";

export interface Committee {
  id: string;
  society_id: string;
  name: string;
  committee_type: CommitteeType;
  term_start_date: string;
  term_end_date: string;
  status: CommitteeStatus;
  description?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  creator?: Profile;
  members?: CommitteeMember[];
}

export interface CommitteeMember {
  id: string;
  committee_id: string;
  society_id: string;
  user_id: string;
  designation: CommitteeMemberDesignation;
  appointed_at: string;
  term_end_date?: string | null;
  resigned_at?: string | null;
  status: CommitteeMemberStatus;
  voting_rights: boolean;
  replaced_by_id?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  profile?: Profile;
  committee?: Committee;
  replaced_by?: CommitteeMember;
}
