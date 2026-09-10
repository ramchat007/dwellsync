import { z } from "zod";

import { EventCategoryEnum } from "./operations";

export const EventAudienceEnum = z.enum([
  "ALL_RESIDENTS",
  "OWNERS_ONLY",
  "COMMITTEE_ONLY",
]);

export const EventStatusEnum = z.enum([
  "DRAFT",
  "PUBLISHED",
  "UPCOMING",
  "COMPLETED",
  "CANCELLED",
]);

export const EventRsvpResponseEnum = z.enum(["GOING", "NOT_GOING", "MAYBE"]);

export const CreateAdvancedEventSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").max(150, "Title is too long"),
  description: z.string().min(5, "Description must be at least 5 characters").max(2000, "Description is too long"),
  category: EventCategoryEnum.default("GENERAL"),
  event_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format must be YYYY-MM-DD"),
  start_time: z.string().optional().nullable().or(z.literal("")),
  end_time: z.string().optional().nullable().or(z.literal("")),
  location: z.string().min(2, "Location must be at least 2 characters").max(150),
  organizer_name: z.string().max(100).optional().nullable().or(z.literal("")),
  visibility: z.enum(["ALL_RESIDENTS", "COMMITTEE_ONLY"]).default("ALL_RESIDENTS"),
  target_audience: EventAudienceEnum.default("ALL_RESIDENTS"),
  capacity: z.coerce.number().int().positive("Capacity must be greater than 0").optional().nullable(),
  status: EventStatusEnum.default("PUBLISHED"),
  reminder_offsets: z.array(z.number().int().positive()).optional(),
});

export const UpdateAdvancedEventSchema = CreateAdvancedEventSchema.partial().extend({
  status: EventStatusEnum.optional(),
});

export const SubmitEventRsvpSchema = z.object({
  response: EventRsvpResponseEnum,
  guests_count: z.coerce.number().int().min(0, "Guests cannot be negative").max(20, "Maximum 20 guests allowed").default(0),
  notes: z.string().max(300, "Notes cannot exceed 300 characters").optional().nullable().or(z.literal("")),
});
