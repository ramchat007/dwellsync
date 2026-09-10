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
  | "DOCUMENT_UPDATED"
  | "DOCUMENT_DELETED"
  | "DOCUMENT_VERSION_UPLOADED"
  | "DOCUMENT_APPROVED"
  | "DOCUMENT_PUBLISHED"
  | "DOCUMENT_ARCHIVED"
  | "DOCUMENT_RESTORED"
  | "DOCUMENT_DOWNLOADED"
  | "DOCUMENT_FOLDER_CREATED"
  | "DOCUMENT_FOLDER_UPDATED"
  | "DOCUMENT_FOLDER_DELETED"
  | "DOCUMENT_ENTITY_LINKED"
  | "DOCUMENT_ENTITY_UNLINKED"
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
  | "RULES_REGULATIONS"
  | "STATUTORY_COMPLIANCE"
  | "ENGINEERING_MAINTENANCE"
  | "LEGAL_CONTRACTS"
  | "BUILDER_HANDOVER"
  | "NOTICES_CIRCULARS"
  | "RESIDENT_UNIT_DOCUMENTS"
  | "GENERAL";

export type DocumentVisibility =
  | "ALL_RESIDENTS"
  | "OWNERS_ONLY"
  | "COMMITTEE_ONLY"
  | "ADMIN_ONLY"
  | "ROLE_RESTRICTED";

export type DocumentStatus =
  | "DRAFT"
  | "UNDER_REVIEW"
  | "APPROVED"
  | "PUBLISHED"
  | "ARCHIVED";

export interface SocietyDocument {
  id: string;
  society_id: string;
  title: string;
  description?: string | null;
  category: DocumentCategory;
  subcategory?: string | null;
  folder_id?: string | null;
  tags?: string[];
  metadata?: Record<string, any>;
  status?: DocumentStatus;
  visibility: DocumentVisibility;
  allowed_roles?: string[];
  unit_id?: string | null;
  resident_id?: string | null;
  document_date?: string | null;
  effective_date?: string | null;
  expiry_date?: string | null;
  file_url: string;
  file_path?: string | null;
  file_type?: string | null;
  file_size_kb?: number | null;
  current_version?: number;
  is_archived?: boolean;
  archived_at?: string | null;
  archived_by?: string | null;
  approved_by?: string | null;
  approved_at?: string | null;
  published_by?: string | null;
  published_at?: string | null;
  publication_notes?: string | null;
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

export type EventStatus = "DRAFT" | "PUBLISHED" | "UPCOMING" | "COMPLETED" | "CANCELLED";

export type EventVisibility = "ALL_RESIDENTS" | "COMMITTEE_ONLY";

export type EventAudience = "ALL_RESIDENTS" | "OWNERS_ONLY" | "COMMITTEE_ONLY";

export type EventRsvpResponse = "GOING" | "NOT_GOING" | "MAYBE";

export interface EventRsvp {
  id: string;
  society_id: string;
  event_id: string;
  user_id: string;
  response: EventRsvpResponse;
  guests_count: number;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  user?: Profile;
}

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
  target_audience?: EventAudience;
  capacity?: number | null;
  status: EventStatus;
  created_at: string;
  updated_at: string;
  organizer?: Profile;
  rsvp_summary?: {
    going: number;
    not_going: number;
    maybe: number;
    total_attendees: number;
  };
  user_rsvp?: EventRsvp | null;
}

// ==========================================
// POLLS & SURVEYS TYPES
// ==========================================

export type PollType = "SINGLE_CHOICE" | "MULTIPLE_CHOICE";
export type PollAudience = "ALL_RESIDENTS" | "OWNERS_ONLY" | "COMMITTEE_ONLY";
export type PollResultsVisibility = "ALWAYS" | "AFTER_VOTING" | "AFTER_CLOSE" | "ADMIN_ONLY";
export type PollStatus = "DRAFT" | "PUBLISHED" | "CLOSED" | "CANCELLED";

export interface PollOption {
  id: string;
  society_id: string;
  poll_id: string;
  option_text: string;
  display_order: number;
  created_at: string;
  vote_count?: number;
  percentage?: number;
}

export interface PollVote {
  id: string;
  society_id: string;
  poll_id: string;
  option_id: string;
  user_id: string;
  created_at: string;
  user?: Profile;
}

export interface SocietyPoll {
  id: string;
  society_id: string;
  title: string;
  description?: string | null;
  question: string;
  poll_type: PollType;
  target_audience: PollAudience;
  is_anonymous: boolean;
  results_visibility: PollResultsVisibility;
  starts_at: string;
  ends_at: string;
  status: PollStatus;
  created_by: string;
  updated_by?: string | null;
  created_at: string;
  updated_at: string;
  creator?: Profile;
  options?: PollOption[];
  total_votes?: number;
  unique_voters_count?: number;
  has_voted?: boolean;
  user_voted_option_ids?: string[];
}

// ==========================================
// ACTIVITY REMINDERS TYPES
// ==========================================

export type ReminderTargetType = "EVENT" | "POLL";
export type ReminderType = "HOURS_BEFORE_START" | "HOURS_BEFORE_END" | "EXACT_TIME";
export type ReminderAudience = "ALL_ELIGIBLE" | "RSVP_GOING" | "NON_VOTERS";
export type ReminderStatus = "PENDING" | "SENT" | "FAILED" | "CANCELLED";

export interface ActivityReminder {
  id: string;
  society_id: string;
  target_type: ReminderTargetType;
  target_id: string;
  reminder_type: ReminderType;
  trigger_offset_hours?: number | null;
  scheduled_at: string;
  audience: ReminderAudience;
  status: ReminderStatus;
  sent_at?: string | null;
  recipients_count?: number;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export type MeetingType =
  | "AGM"
  | "EGM"
  | "MANAGING_COMMITTEE"
  | "SUB_COMMITTEE"
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
  organizer?: Profile | null;
  presiding_officer?: Profile | null;
  minutes_document?: SocietyDocument;
  committee?: Committee | null;
  agendas?: MeetingAgenda[];
  attendees?: MeetingAttendee[];
  minutes?: MeetingMinutes | null;
  action_items?: MeetingActionItem[];
}

// ==========================================
// PHASE 9: MAINTENANCE & BILLING MODELS
// ==========================================

export type MaintenanceChargeType =
  | "FLAT_RATE"
  | "CARPET_AREA"
  | "BUILT_UP_AREA"
  | "PER_UNIT"
  | "PER_PARKING_SLOT"
  | "PER_OCCUPANT"
  | "PERCENTAGE"
  | "USAGE_BASED"
  | "CUSTOM"
  | "AREA_BASED"
  | "UNIT_TYPE_BASED";

export type MaintenanceFrequency =
  | "MONTHLY"
  | "QUARTERLY"
  | "BIANNUAL"
  | "ANNUAL"
  | "ONE_TIME";

export interface RateComponent {
  name: string;
  charge_type: MaintenanceChargeType;
  rate: number;
  description?: string;
}

export interface MaintenanceConfiguration {
  id: string;
  society_id: string;
  name: string;
  description?: string | null;
  charge_type: MaintenanceChargeType;
  rate: number;
  unit_type_rates?: Record<string, number> | null;
  rate_components?: RateComponent[] | null;
  late_fee_type?: "NONE" | "FLAT" | "PERCENTAGE" | null;
  late_fee_amount?: number | null;
  grace_period_days?: number | null;
  version?: number;
  parent_config_id?: string | null;
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

// ==========================================
// PHASE 11.3: GOVERNANCE COMMITTEE MEETINGS & PROCEEDINGS
// ==========================================

export type AgendaStatus = "PENDING" | "DISCUSSED" | "DEFERRED";

export type AttendeeType = "MEMBER" | "INVITEE" | "SPECIAL_GUEST";

export type MinutesStatus = "DRAFT" | "PUBLISHED";

export type ActionItemStatus = "OPEN" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";

export interface MeetingAgenda {
  id: string;
  society_id: string;
  meeting_id: string;
  item_order: number;
  title: string;
  description?: string | null;
  presenter?: string | null;
  duration_minutes?: number | null;
  status: AgendaStatus;
  created_at: string;
  updated_at: string;
}

export interface MeetingAttendee {
  id: string;
  society_id: string;
  meeting_id: string;
  user_id: string;
  attendee_type: AttendeeType;
  attended: boolean;
  status?: "PRESENT" | "ABSENT" | "EXCUSED";
  marked_at: string;
  notes?: string | null;
  profile?: Profile;
}

export interface MeetingMinutes {
  id: string;
  society_id: string;
  meeting_id: string;
  content_summary: string;
  decisions_summary?: string | null;
  recorded_by: string;
  status: MinutesStatus;
  published_at?: string | null;
  published_by?: string | null;
  created_at: string;
  updated_at: string;
  recorder?: Profile;
  publisher?: Profile;
}

export interface MeetingActionItem {
  id: string;
  society_id: string;
  meeting_id: string;
  title: string;
  description?: string | null;
  assigned_to?: string | null;
  due_date?: string | null;
  status: ActionItemStatus;
  completed_at?: string | null;
  created_at: string;
  updated_at: string;
  assignee?: Profile | null;
}

// ==========================================
// PHASE 13: SOCIETY ACCOUNTING & FINANCE MODELS
// ==========================================

export type UnitChargeOverrideType =
  | "FIXED_OVERRIDE"
  | "ADDITIONAL_SURCHARGE"
  | "DISCOUNT_FIXED"
  | "DISCOUNT_PERCENTAGE"
  | "EXEMPTION";

export interface UnitChargeOverride {
  id: string;
  society_id: string;
  unit_id: string;
  charge_config_id?: string | null;
  override_type: UnitChargeOverrideType;
  amount: number;
  reason: string;
  effective_from: string;
  effective_to?: string | null;
  is_active: boolean;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  unit?: Unit;
  charge_config?: MaintenanceConfiguration;
}

export interface FinancialYear {
  id: string;
  society_id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
  is_closed: boolean;
  closed_at?: string | null;
  closed_by?: string | null;
  created_at: string;
  updated_at: string;
  periods?: FinancialPeriod[];
}

export type FinancialPeriodStatus = "OPEN" | "LOCKED" | "CLOSED";

export interface FinancialPeriod {
  id: string;
  society_id: string;
  financial_year_id: string;
  period_number: number;
  name: string;
  start_date: string;
  end_date: string;
  status: FinancialPeriodStatus;
  locked_at?: string | null;
  locked_by?: string | null;
  lock_reason?: string | null;
  created_at: string;
  updated_at: string;
  financial_year?: FinancialYear;
}

export type AccountType = "ASSET" | "LIABILITY" | "EQUITY" | "INCOME" | "EXPENSE";

export type AccountCategory =
  | "CURRENT_ASSET"
  | "FIXED_ASSET"
  | "BANK"
  | "CASH"
  | "CURRENT_LIABILITY"
  | "LONG_TERM_LIABILITY"
  | "RESERVE_FUND"
  | "OPERATING_INCOME"
  | "OTHER_INCOME"
  | "OPERATING_EXPENSE"
  | "ADMINISTRATIVE_EXPENSE"
  | "TAX_EXPENSE";

export interface ChartOfAccount {
  id: string;
  society_id: string;
  account_code: string;
  account_name: string;
  account_type: AccountType;
  category: AccountCategory;
  parent_account_id?: string | null;
  description?: string | null;
  is_active: boolean;
  is_system: boolean;
  created_at: string;
  updated_at: string;
  parent_account?: ChartOfAccount | null;
  children?: ChartOfAccount[];
}

export type BankAccountType = "SAVINGS" | "CURRENT" | "FIXED_DEPOSIT" | "CASH_CREDIT" | "PETTY_CASH";

export interface SocietyBankAccount {
  id: string;
  society_id: string;
  account_id: string;
  bank_name: string;
  account_number: string;
  account_type: BankAccountType;
  branch_name?: string | null;
  ifsc_code?: string | null;
  opening_balance: number;
  current_balance: number;
  is_primary: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  coa_account?: ChartOfAccount;
}

export interface AccountOpeningBalance {
  id: string;
  society_id: string;
  financial_year_id: string;
  account_id: string;
  debit_balance: number;
  credit_balance: number;
  created_at: string;
  account?: ChartOfAccount;
}

export type JournalEntryType =
  | "STANDARD"
  | "INVOICE_BILLING"
  | "PAYMENT_RECEIPT"
  | "VENDOR_EXPENSE"
  | "BANK_TRANSFER"
  | "ADJUSTMENT"
  | "REVERSAL"
  | "OPENING_BALANCE";

export type JournalEntryStatus = "DRAFT" | "POSTED" | "REVERSED" | "VOID";

export interface JournalLine {
  id: string;
  society_id: string;
  journal_entry_id: string;
  account_id: string;
  line_number: number;
  debit_amount: number;
  credit_amount: number;
  description?: string | null;
  unit_id?: string | null;
  created_at: string;
  account?: ChartOfAccount;
  unit?: Unit;
}

export interface JournalEntry {
  id: string;
  society_id: string;
  financial_year_id?: string | null;
  financial_period_id?: string | null;
  entry_number: string;
  entry_date: string;
  entry_type: JournalEntryType;
  narration: string;
  status: JournalEntryStatus;
  is_backdated: boolean;
  backdated_reason?: string | null;
  reversal_of_id?: string | null;
  source_reference_type?: string | null;
  source_reference_id?: string | null;
  total_debit: number;
  total_credit: number;
  created_by?: string | null;
  approved_by?: string | null;
  created_at: string;
  updated_at: string;
  lines?: JournalLine[];
  creator?: Profile;
  approver?: Profile;
  period?: FinancialPeriod;
}

export type ExpensePaymentStatus = "UNPAID" | "PAID" | "CANCELLED";
export type ExpensePaymentMode = "CHEQUE" | "BANK_TRANSFER" | "UPI" | "CASH" | "CREDIT";

export interface ExpenseVoucher {
  id: string;
  society_id: string;
  voucher_number: string;
  voucher_date: string;
  vendor_name: string;
  vendor_id?: string | null;
  expense_account_id: string;
  paid_from_account_id?: string | null;
  amount: number;
  payment_status: ExpensePaymentStatus;
  payment_mode?: ExpensePaymentMode | null;
  reference_number?: string | null;
  description: string;
  created_by?: string | null;
  approved_by?: string | null;
  created_at: string;
  updated_at: string;
  expense_account?: ChartOfAccount;
  paid_from_account?: ChartOfAccount;
  creator?: Profile;
  approver?: Profile;
}

export type ReconciliationStatus = "IN_PROGRESS" | "RECONCILED" | "LOCKED";

export interface BankReconciliation {
  id: string;
  society_id: string;
  bank_account_id: string;
  financial_period_id?: string | null;
  statement_date: string;
  statement_closing_balance: number;
  ledger_closing_balance: number;
  difference: number;
  status: ReconciliationStatus;
  reconciled_at?: string | null;
  reconciled_by?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  bank_account?: SocietyBankAccount;
  period?: FinancialPeriod;
}

export interface BankTransaction {
  id: string;
  society_id: string;
  bank_account_id: string;
  reconciliation_id?: string | null;
  transaction_date: string;
  description: string;
  reference_number?: string | null;
  withdrawal: number;
  deposit: number;
  balance?: number | null;
  is_reconciled: boolean;
  matched_journal_line_id?: string | null;
  reconciled_at?: string | null;
  created_at: string;
}

export type FinancialReportType =
  | "BALANCE_SHEET"
  | "INCOME_EXPENDITURE"
  | "TRIAL_BALANCE"
  | "GENERAL_LEDGER"
  | "RECEIVABLES_SUMMARY"
  | "ANNUAL_AUDIT_REPORT";

export type FinancialReportStatus = "DRAFT" | "AUDITED" | "APPROVED" | "PUBLISHED";

export interface FinancialReport {
  id: string;
  society_id: string;
  financial_year_id?: string | null;
  financial_period_id?: string | null;
  report_type: FinancialReportType;
  title: string;
  report_data: Record<string, unknown>;
  status: FinancialReportStatus;
  generated_by?: string | null;
  approved_by?: string | null;
  approved_at?: string | null;
  published_by?: string | null;
  published_at?: string | null;
  published_notes?: string | null;
  created_at: string;
  updated_at: string;
  generator?: Profile;
  approver?: Profile;
  publisher?: Profile;
}

// ============================================================================
// ASSETS & INVENTORY TYPES
// ============================================================================

export type AssetCategory =
  | "ELECTRICAL"
  | "PLUMBING"
  | "HVAC_LIFTS"
  | "FIRE_SAFETY"
  | "SECURITY_SURVEILLANCE"
  | "DG_POWER"
  | "CIVIL_INFRASTRUCTURE"
  | "COMMON_AREA_FURNITURE"
  | "CLUBHOUSE_GYM"
  | "GARDENING_LANDSCAPING"
  | "OFFICE_IT"
  | "OTHER";

export type AssetStatus =
  | "ACTIVE"
  | "UNDER_MAINTENANCE"
  | "DAMAGED"
  | "DISPOSED"
  | "LOST";

export type AssetCondition =
  | "EXCELLENT"
  | "GOOD"
  | "FAIR"
  | "POOR"
  | "SCRAP";

export interface Asset {
  id: string;
  society_id: string;
  asset_code: string;
  name: string;
  description?: string | null;
  category: AssetCategory;
  subcategory?: string | null;
  building_id?: string | null;
  wing_id?: string | null;
  location_description?: string | null;
  purchase_date?: string | null;
  purchase_cost: number;
  vendor_name?: string | null;
  vendor_id?: string | null;
  expense_voucher_id?: string | null;
  status: AssetStatus;
  condition: AssetCondition;
  assigned_to?: string | null;
  department?: string | null;
  manufacturer?: string | null;
  model_number?: string | null;
  serial_number?: string | null;
  warranty_provider?: string | null;
  warranty_start?: string | null;
  warranty_end?: string | null;
  warranty_terms?: string | null;
  amc_vendor?: string | null;
  amc_start?: string | null;
  amc_end?: string | null;
  amc_cost: number;
  amc_terms?: string | null;
  expected_life_years?: number | null;
  disposal_date?: string | null;
  disposal_reason?: string | null;
  disposal_value?: number;
  disposed_to?: string | null;
  photos: string[];
  notes?: string | null;
  handover_asset_id?: string | null;
  created_by?: string | null;
  updated_by?: string | null;
  created_at: string;
  updated_at: string;
  building?: Building | null;
  wing?: Wing | null;
  assignee?: Profile | null;
}

export type MaintenanceType =
  | "PREVENTIVE"
  | "BREAKDOWN"
  | "INSPECTION"
  | "AMC_SERVICE"
  | "STATUTORY_INSPECTION"
  | "OVERHAUL"
  | "OTHER";

export type MaintenanceStatus =
  | "SCHEDULED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED";

export interface AssetMaintenanceRecord {
  id: string;
  society_id: string;
  asset_id: string;
  title: string;
  maintenance_type: MaintenanceType;
  status: MaintenanceStatus;
  service_date: string;
  completion_date?: string | null;
  work_description: string;
  vendor_name?: string | null;
  technician_name?: string | null;
  technician_contact?: string | null;
  cost: number;
  is_covered_under_warranty: boolean;
  is_covered_under_amc: boolean;
  amc_reference?: string | null;
  expense_voucher_id?: string | null;
  next_service_date?: string | null;
  notes?: string | null;
  attachments: string[];
  created_by?: string | null;
  updated_by?: string | null;
  created_at: string;
  updated_at: string;
  asset?: Asset;
  creator?: Profile;
}

export type InventoryCategory =
  | "ELECTRICAL"
  | "PLUMBING"
  | "HOUSEKEEPING"
  | "SECURITY_STATIONERY"
  | "CIVIL_REPAIR"
  | "HARDWARE_TOOLS"
  | "GARDENING"
  | "FIRE_SAFETY"
  | "OFFICE_SUPPLIES"
  | "OTHER";

export type UnitOfMeasure =
  | "PIECES"
  | "METERS"
  | "LITERS"
  | "KGS"
  | "BOXES"
  | "PACKETS"
  | "SETS"
  | "ROLLS"
  | "OTHER";

export type InventoryStatus = "ACTIVE" | "DISCONTINUED";

export interface InventoryItem {
  id: string;
  society_id: string;
  item_code: string;
  name: string;
  description?: string | null;
  category: InventoryCategory;
  unit_of_measure: UnitOfMeasure;
  opening_quantity: number;
  current_quantity: number;
  min_reorder_level: number;
  unit_cost: number;
  supplier_name?: string | null;
  supplier_contact?: string | null;
  storage_location?: string | null;
  status: InventoryStatus;
  notes?: string | null;
  created_by?: string | null;
  updated_by?: string | null;
  created_at: string;
  updated_at: string;
}

export type MovementType = "RECEIPT" | "ISSUE" | "ADJUSTMENT" | "RETURN";

export type AdjustmentReason =
  | "DAMAGED_EXPIRED"
  | "AUDIT_DISCREPANCY"
  | "INITIAL_CORRECTION"
  | "SCRAP"
  | "THEFT_LOSS"
  | "OTHER";

export interface InventoryStockMovement {
  id: string;
  society_id: string;
  item_id: string;
  movement_type: MovementType;
  quantity: number;
  quantity_delta: number;
  balance_before: number;
  balance_after: number;
  unit_price: number;
  total_cost: number;
  movement_date: string;
  issued_to_name?: string | null;
  issued_to_profile_id?: string | null;
  department?: string | null;
  purpose?: string | null;
  building_id?: string | null;
  unit_id?: string | null;
  adjustment_reason?: AdjustmentReason | null;
  notes?: string | null;
  expense_voucher_id?: string | null;
  created_by?: string | null;
  created_at: string;
  item?: InventoryItem;
  creator?: Profile;
}



