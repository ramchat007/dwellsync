import { z } from "zod";

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

export const ComplaintPriorityEnum = z.enum([
  "LOW",
  "MEDIUM",
  "HIGH",
  "CRITICAL",
  "EMERGENCY",
]);

export const ComplaintStatusEnum = z.enum([
  "SUBMITTED",
  "NEW",
  "ACKNOWLEDGED",
  "ASSIGNED",
  "IN_PROGRESS",
  "ON_HOLD",
  "RESOLVED",
  "CLOSED",
  "REOPENED",
]);

export const ComplaintSlaStatusEnum = z.enum([
  "ON_TRACK",
  "DUE_SOON",
  "BREACHED",
  "PAUSED",
  "COMPLETED",
]);

export const OnHoldReasonEnum = z.enum([
  "WAITING_FOR_PARTS",
  "WAITING_FOR_RESIDENT_INPUT",
  "THIRD_PARTY_VENDOR",
  "RESIDENT_UNAVAILABLE",
  "OTHER",
]);

export const CreateComplaintSchema = z.object({
  unit_id: z.string().uuid("Invalid unit ID").optional().nullable().or(z.literal("")),
  title: z.string().min(3, "Title must be at least 3 characters.").max(150, "Title cannot exceed 150 characters."),
  description: z.string().min(5, "Please provide detailed description.").max(2000, "Description cannot exceed 2000 characters."),
  category: ComplaintCategoryEnum,
  subcategory: z.string().max(100).optional().nullable().or(z.literal("")),
  priority: ComplaintPriorityEnum.default("MEDIUM"),
});

export const UpdateComplaintBaseSchema = z.object({
  status: ComplaintStatusEnum.optional(),
  priority: ComplaintPriorityEnum.optional(),
  assigned_to: z.string().uuid("Invalid staff ID").optional().nullable().or(z.literal("")),
  resolution_notes: z.string().max(2000).optional().nullable().or(z.literal("")),
  on_hold_reason: z.string().max(500).optional().nullable().or(z.literal("")),
  closure_reason: z.string().max(500).optional().nullable().or(z.literal("")),
});

export const UpdateComplaintSchema = UpdateComplaintBaseSchema.refine(
  (data) => {
    if (data.status === "ON_HOLD" && !data.on_hold_reason) {
      return false;
    }
    return true;
  },
  {
    message: "An on-hold reason is required when moving complaint to ON_HOLD",
    path: ["on_hold_reason"],
  }
);

export const ReopenComplaintSchema = z.object({
  reason: z.string().min(5, "Please specify a reason for reopening (at least 5 characters).").max(1000),
});

export const CloseComplaintSchema = z.object({
  closure_reason: z.string().max(500).optional().nullable().or(z.literal("")),
});

export const ComplaintSlaConfigSchema = z.object({
  category: z.union([ComplaintCategoryEnum, z.literal("ALL")]),
  priority: z.union([ComplaintPriorityEnum, z.literal("ALL")]),
  response_time_hours: z.coerce.number().positive("Response time must be greater than 0"),
  resolution_time_hours: z.coerce.number().positive("Resolution time must be greater than 0"),
  business_hours_only: z.boolean().default(false),
  business_hours_start: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/, "Invalid time format (HH:MM)").default("09:00:00"),
  business_hours_end: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/, "Invalid time format (HH:MM)").default("18:00:00"),
  exclude_weekends: z.boolean().default(true),
  effective_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format must be YYYY-MM-DD").default(() => new Date().toISOString().split("T")[0]),
  effective_to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format must be YYYY-MM-DD").optional().nullable().or(z.literal("")),
  is_active: z.boolean().default(true),
}).refine(
  (data) => {
    if (data.resolution_time_hours < data.response_time_hours) {
      return false;
    }
    return true;
  },
  {
    message: "Resolution SLA time must be greater than or equal to response SLA time",
    path: ["resolution_time_hours"],
  }
);

export const ComplaintEscalationRuleSchema = z.object({
  level: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  trigger_condition: z.enum([
    "BREACH_RESPONSE",
    "BREACH_RESOLUTION",
    "CRITICAL_UNASSIGNED_1H",
    "DUE_SOON_2H",
  ]),
  notify_roles: z.array(z.string()).min(1, "At least one notification role is required"),
  is_active: z.boolean().default(true),
});
