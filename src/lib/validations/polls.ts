import { z } from "zod";

export const PollTypeEnum = z.enum(["SINGLE_CHOICE", "MULTIPLE_CHOICE"]);

export const PollAudienceEnum = z.enum([
  "ALL_RESIDENTS",
  "OWNERS_ONLY",
  "COMMITTEE_ONLY",
]);

export const PollResultsVisibilityEnum = z.enum([
  "ALWAYS",
  "AFTER_VOTING",
  "AFTER_CLOSE",
  "ADMIN_ONLY",
]);

export const PollStatusEnum = z.enum([
  "DRAFT",
  "PUBLISHED",
  "CLOSED",
  "CANCELLED",
]);

export const CreatePollSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").max(200, "Title is too long"),
  description: z.string().max(2000, "Description is too long").optional().nullable().or(z.literal("")),
  question: z.string().min(5, "Question must be at least 5 characters").max(500, "Question is too long"),
  poll_type: PollTypeEnum.default("SINGLE_CHOICE"),
  target_audience: PollAudienceEnum.default("ALL_RESIDENTS"),
  is_anonymous: z.boolean().default(false),
  results_visibility: PollResultsVisibilityEnum.default("ALWAYS"),
  starts_at: z.string().optional(),
  ends_at: z.string().min(1, "Closing date and time is required"),
  status: PollStatusEnum.default("PUBLISHED"),
  options: z
    .array(z.string().trim().min(1, "Option text cannot be empty"))
    .min(2, "A poll must have at least 2 options")
    .max(20, "A poll can have at most 20 options"),
  reminder_offset_hours: z.array(z.number().int().positive()).optional(),
}).refine(
  (data) => {
    if (data.starts_at && data.ends_at) {
      return new Date(data.ends_at).getTime() > new Date(data.starts_at).getTime();
    }
    return true;
  },
  {
    message: "Closing time must be after the starting time",
    path: ["ends_at"],
  }
);

export const UpdatePollSchema = z.object({
  title: z.string().min(3).max(200).optional(),
  description: z.string().max(2000).optional().nullable().or(z.literal("")),
  question: z.string().min(5).max(500).optional(),
  target_audience: PollAudienceEnum.optional(),
  results_visibility: PollResultsVisibilityEnum.optional(),
  ends_at: z.string().optional(),
  status: PollStatusEnum.optional(),
});

export const CastVoteSchema = z.object({
  option_ids: z.array(z.string().uuid("Invalid option ID")).min(1, "Please select at least one option"),
});
