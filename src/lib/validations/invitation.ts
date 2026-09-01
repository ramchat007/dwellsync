import * as z from "zod";
import { roleIdEnum } from "./membership";

export const invitationSchema = z.object({
  society_id: z.string().uuid("Invalid society ID"),
  email: z.string().email("Valid email is required"),
  role_id: roleIdEnum.refine((r) => r !== "SUPER_ADMIN", {
    message: "Cannot invite users with SUPER_ADMIN role",
  }),
  unit_id: z.string().uuid("Invalid unit ID").optional().nullable(),
  unit_number: z.string().max(30).optional().nullable(),
});

export type InvitationInput = z.infer<typeof invitationSchema>;

