import { z } from "zod";

export const CommitteeTypeEnum = z.enum([
  "MANAGING_COMMITTEE",
  "SUB_COMMITTEE",
  "GRIEVANCE_COMMITTEE",
  "ELECTION_COMMITTEE",
  "OTHER",
]);

export const CommitteeStatusEnum = z.enum([
  "ACTIVE",
  "EXPIRED",
  "DISSOLVED",
]);

export const CommitteeMemberDesignationEnum = z.enum([
  "PRESIDENT",
  "VICE_PRESIDENT",
  "CHAIRMAN",
  "SECRETARY",
  "JOINT_SECRETARY",
  "TREASURER",
  "JOINT_TREASURER",
  "EXECUTIVE_MEMBER",
  "INVITEE",
]);

export const CommitteeMemberStatusEnum = z.enum([
  "ACTIVE",
  "RESIGNED",
  "REMOVED",
  "EXPIRED",
]);

export const CreateCommitteeSchema = z
  .object({
    name: z.string().min(3, "Name must be at least 3 characters.").max(150),
    committee_type: CommitteeTypeEnum.default("MANAGING_COMMITTEE"),
    term_start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format must be YYYY-MM-DD"),
    term_end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format must be YYYY-MM-DD"),
    description: z.string().max(1000).optional().nullable(),
  })
  .refine((data) => data.term_end_date >= data.term_start_date, {
    message: "Term end date cannot be earlier than term start date",
    path: ["term_end_date"],
  });

export const UpdateCommitteeSchema = z.object({
  name: z.string().min(3).max(150).optional(),
  term_start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  term_end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  status: CommitteeStatusEnum.optional(),
  description: z.string().max(1000).optional().nullable(),
});

export const AppointCommitteeMemberSchema = z.object({
  user_id: z.string().uuid("Invalid user UUID"),
  designation: CommitteeMemberDesignationEnum,
  appointed_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  term_end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  voting_rights: z.boolean().default(true),
  notes: z.string().max(1000).optional().nullable(),
});

export const UpdateCommitteeMemberSchema = z.object({
  designation: CommitteeMemberDesignationEnum.optional(),
  voting_rights: z.boolean().optional(),
  notes: z.string().max(1000).optional().nullable(),
});

export const ResignMemberSchema = z.object({
  resigned_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  reason: z.string().max(500).optional().nullable(),
});

export const RemoveMemberSchema = z.object({
  removed_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  reason: z.string().max(500).optional().nullable(),
});

export const ReplaceMemberSchema = z.object({
  incoming_user_id: z.string().uuid("Invalid incoming user UUID"),
  designation: CommitteeMemberDesignationEnum.optional(),
  replacement_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  notes: z.string().max(500).optional().nullable(),
});

// ==========================================
// PHASE 11.3: GOVERNANCE MEETINGS SCHEMAS
// ==========================================

export const MeetingTypeEnum = z.enum([
  "AGM",
  "EGM",
  "MANAGING_COMMITTEE",
  "SUB_COMMITTEE",
  "VENDOR",
  "GENERAL",
]);

export const MeetingLocationTypeEnum = z.enum(["PHYSICAL", "ONLINE", "HYBRID"]);

export const MeetingStatusEnum = z.enum([
  "SCHEDULED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
]);

export const AgendaStatusEnum = z.enum(["PENDING", "DISCUSSED", "DEFERRED"]);

export const AttendeeTypeEnum = z.enum(["MEMBER", "INVITEE", "SPECIAL_GUEST"]);

export const MinutesStatusEnum = z.enum(["DRAFT", "PUBLISHED"]);

export const ActionItemStatusEnum = z.enum([
  "OPEN",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
]);

export const CreateGovernanceMeetingSchema = z.object({
  title: z.string().trim().min(3, "Title must be at least 3 characters.").max(150),
  meeting_type: MeetingTypeEnum,
  committee_id: z.string().uuid("Invalid committee UUID").optional().nullable(),
  presiding_officer_id: z.string().uuid("Invalid presiding officer UUID").optional().nullable(),
  scheduled_at: z.string().min(1, "Scheduled timestamp is required"),
  duration_minutes: z.coerce.number().int().positive().default(60),
  location_type: MeetingLocationTypeEnum.default("PHYSICAL"),
  location_details: z.string().max(255).optional().nullable(),
  meeting_link: z.string().max(500).optional().nullable(),
  quorum_required: z.coerce.number().int().min(0).default(0),
  agenda: z.string().max(3000).optional().nullable(),
});

export const UpdateGovernanceMeetingSchema = z.object({
  title: z.string().trim().min(3).max(150).optional(),
  scheduled_at: z.string().optional(),
  duration_minutes: z.coerce.number().int().positive().optional(),
  location_type: MeetingLocationTypeEnum.optional(),
  location_details: z.string().max(255).optional().nullable(),
  meeting_link: z.string().max(500).optional().nullable(),
  presiding_officer_id: z.string().uuid().optional().nullable(),
  quorum_required: z.coerce.number().int().min(0).optional(),
  status: MeetingStatusEnum.optional(),
  agenda: z.string().max(3000).optional().nullable(),
});

export const CreateMeetingAgendaSchema = z.object({
  title: z.string().trim().min(3, "Agenda title must be at least 3 characters.").max(255),
  description: z.string().max(2000).optional().nullable(),
  item_order: z.coerce.number().int().positive().default(1),
});

export const UpdateMeetingAgendaSchema = z.object({
  title: z.string().trim().min(3).max(255).optional(),
  description: z.string().max(2000).optional().nullable(),
  item_order: z.coerce.number().int().positive().optional(),
  status: AgendaStatusEnum.optional(),
});

export const RecordMeetingAttendanceSchema = z.object({
  attendees: z.array(
    z.object({
      user_id: z.string().uuid("Invalid attendee user UUID"),
      attendee_type: AttendeeTypeEnum.default("MEMBER"),
      attended: z.boolean().default(true),
      notes: z.string().max(500).optional().nullable(),
    })
  ).min(1, "At least one attendee record must be provided"),
});

export const UpsertMeetingMinutesSchema = z.object({
  content_summary: z.string().trim().min(10, "Summary must be at least 10 characters.").max(10000),
  decisions_summary: z.string().max(5000).optional().nullable(),
});

export const CreateActionItemSchema = z.object({
  title: z.string().trim().min(3, "Title must be at least 3 characters.").max(255),
  description: z.string().max(2000).optional().nullable(),
  assigned_to: z.string().uuid("Invalid assignee UUID").optional().nullable(),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format must be YYYY-MM-DD").optional().nullable(),
});

export const UpdateActionItemSchema = z.object({
  title: z.string().trim().min(3).max(255).optional(),
  description: z.string().max(2000).optional().nullable(),
  assigned_to: z.string().uuid("Invalid assignee UUID").optional().nullable(),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  status: ActionItemStatusEnum.optional(),
});

