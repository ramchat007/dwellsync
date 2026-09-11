import { z } from "zod";

// ==========================================
// COMPLAINTS SCHEMAS
// ==========================================

export const ComplaintCategoryEnum = z.enum([
  "ELECTRICAL",
  "PLUMBING",
  "ELEVATOR",
  "COMMON_AREA",
  "SECURITY",
  "NOISE",
  "CARPENTRY",
  "CLEANLINESS",
  "OTHER",
]);

export {
  ComplaintPriorityEnum,
  ComplaintStatusEnum,
  ComplaintSlaStatusEnum,
  OnHoldReasonEnum,
  CreateComplaintSchema,
  UpdateComplaintSchema,
  ReopenComplaintSchema,
  CloseComplaintSchema,
  ComplaintSlaConfigSchema,
  ComplaintEscalationRuleSchema,
} from "./complaints";

// ==========================================
// AMENITIES SCHEMAS
// ==========================================

export const AmenityCategoryEnum = z.enum([
  "CLUBHOUSE",
  "GYM",
  "SWIMMING_POOL",
  "TENNIS_COURT",
  "COMMUNITY_HALL",
  "ROOFTOP",
  "BADMINTON_COURT",
  "OTHER",
]);

export const AmenityStatusEnum = z.enum(["AVAILABLE", "MAINTENANCE", "CLOSED"]);

export const CreateAmenitySchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters.").max(100),
  description: z.string().max(1000).optional().nullable().or(z.literal("")),
  category: AmenityCategoryEnum,
  capacity: z.coerce.number().int().positive().optional().nullable(),
  operating_hours_start: z.string().default("06:00"),
  operating_hours_end: z.string().default("22:00"),
  slot_duration_minutes: z.coerce.number().int().positive().default(60),
  rules: z.string().max(2000).optional().nullable().or(z.literal("")),
  status: AmenityStatusEnum.default("AVAILABLE"),
});

export const UpdateAmenitySchema = CreateAmenitySchema.partial();

export const BookAmenitySchema = z.object({
  amenity_id: z.string().uuid("Invalid amenity ID"),
  unit_id: z.string().uuid("Invalid unit ID").optional().nullable().or(z.literal("")),
  booking_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format must be YYYY-MM-DD"),
  start_time: z.string().min(1, "Start time is required"),
  end_time: z.string().min(1, "End time is required"),
  notes: z.string().max(500).optional().nullable().or(z.literal("")),
});

// ==========================================
// EVENTS SCHEMAS
// ==========================================

export const EventCategoryEnum = z.enum([
  "CELEBRATION",
  "MEETING",
  "WORKSHOP",
  "SPORTS",
  "CULTURAL",
  "GENERAL",
]);

export const EventVisibilityEnum = z.enum(["ALL_RESIDENTS", "COMMITTEE_ONLY"]);

export const CreateEventSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters.").max(150),
  description: z.string().min(5, "Description must be at least 5 characters.").max(2000),
  category: EventCategoryEnum.default("GENERAL"),
  event_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format must be YYYY-MM-DD"),
  start_time: z.string().optional().nullable().or(z.literal("")),
  end_time: z.string().optional().nullable().or(z.literal("")),
  location: z.string().min(2, "Location must be at least 2 characters.").max(150),
  organizer_name: z.string().max(100).optional().nullable().or(z.literal("")),
  visibility: EventVisibilityEnum.default("ALL_RESIDENTS"),
});

// ==========================================
// MEETINGS SCHEMAS
// ==========================================

export const MeetingTypeEnum = z.enum([
  "AGM",
  "EGM",
  "MANAGING_COMMITTEE",
  "VENDOR",
  "GENERAL",
]);

export const MeetingLocationTypeEnum = z.enum(["PHYSICAL", "ONLINE", "HYBRID"]);

export const CreateMeetingSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters.").max(150),
  agenda: z.string().max(3000).optional().nullable().or(z.literal("")),
  meeting_type: MeetingTypeEnum,
  location_type: MeetingLocationTypeEnum.default("PHYSICAL"),
  location_details: z.string().max(255).optional().nullable().or(z.literal("")),
  meeting_link: z.string().max(500).optional().nullable().or(z.literal("")),
  scheduled_at: z.string().min(1, "Scheduled timestamp is required"),
  duration_minutes: z.coerce.number().int().positive().default(60),
});

// ==========================================
// NOTICES SCHEMAS
// ==========================================

export const CreateNoticeSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters.").max(150),
  description: z.string().min(5, "Description must be at least 5 characters.").max(3000),
  category: z.enum(["GENERAL", "MAINTENANCE", "URGENT", "EVENT", "BILLING"]).default("GENERAL"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "EMERGENCY"]).default("MEDIUM"),
  expires_at: z.string().optional().nullable().or(z.literal("")),
  attachment_url: z.string().optional().nullable().or(z.literal("")),
});

// ==========================================
// DOCUMENTS SCHEMAS
// ==========================================

export const CreateDocumentSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters.").max(150),
  description: z.string().max(1000).optional().nullable().or(z.literal("")),
  category: z.enum([
    "SOCIETY_BYLAWS",
    "AGM_MINUTES",
    "FINANCIAL_REPORT",
    "FORMS_TEMPLATES",
    "RULES_REGULATIONS",
  ]),
  file_url: z.string().min(3, "File URL or attachment reference is required"),
  file_type: z.string().max(50).optional().nullable().or(z.literal("")),
  file_size_kb: z.coerce.number().int().nonnegative().optional().nullable(),
  visibility: z.enum(["ALL_RESIDENTS", "OWNERS_ONLY", "COMMITTEE_ONLY"]).default("ALL_RESIDENTS"),
});
