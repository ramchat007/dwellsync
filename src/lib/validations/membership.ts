import * as z from "zod";

export const roleIdEnum = z.enum([
  "SUPER_ADMIN",
  "SOCIETY_ADMIN",
  "COMMITTEE_MEMBER",
  "SECRETARY",
  "TREASURER",
  "MANAGER",
  "RESIDENT",
  "OWNER",
  "TENANT",
  "SECURITY",
  "STAFF",
  "VENDOR",
  "AUDITOR",
]);

export const membershipStatusEnum = z.enum(["INVITED", "ACTIVE", "SUSPENDED", "REMOVED"]);

export const membershipSchema = z.object({
  society_id: z.string().uuid("Invalid society ID"),
  user_id: z.string().uuid("Invalid user ID"),
  role_id: roleIdEnum.refine((r) => r !== "SUPER_ADMIN", {
    message: "Cannot assign SUPER_ADMIN as a society membership role",
  }),
  unit_number: z.string().max(30).optional().nullable(),
  status: membershipStatusEnum.default("ACTIVE"),
});

export const membershipUpdateSchema = z.object({
  role_id: roleIdEnum.optional(),
  unit_number: z.string().max(30).optional().nullable(),
  status: membershipStatusEnum.optional(),
});

export type MembershipInput = z.infer<typeof membershipSchema>;
export type MembershipUpdateInput = z.infer<typeof membershipUpdateSchema>;

