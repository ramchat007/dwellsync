import * as z from "zod";

export const profileStatusEnum = z.enum(["ACTIVE", "INACTIVE", "SUSPENDED"]);

export const profileSchema = z.object({
  full_name: z.string().min(1, "Full name is required").max(100),
  display_name: z.string().max(60).optional().nullable(),
  avatar_url: z.string().url("Invalid URL format").optional().nullable(),
  phone: z.string().regex(/^[0-9+ -]{7,15}$/, "Invalid phone format").optional().nullable(),
  alternate_phone: z.string().regex(/^[0-9+ -]{7,15}$/, "Invalid phone format").optional().nullable(),
  status: profileStatusEnum.default("ACTIVE"),
});

export const profileUpdateSchema = profileSchema.partial();

export type ProfileInput = z.infer<typeof profileSchema>;
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;

