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
