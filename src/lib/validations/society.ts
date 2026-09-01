import * as z from "zod";

export const societyTypeEnum = z.enum([
  "COOPERATIVE_HOUSING",
  "APARTMENT_SOCIETY",
  "GATED_COMMUNITY",
  "VILLA_COMMUNITY",
  "CONDOMINIUM",
  "PROPERTY_MANAGEMENT",
  "OTHER",
]);

export const societyStatusEnum = z.enum([
  "ONBOARDING",
  "ACTIVE",
  "SUSPENDED",
  "ARCHIVED",
]);

export const societySchema = z.object({
  name: z.string().min(2, "Society name must be at least 2 characters").max(120),
  code: z
    .string()
    .min(2, "Society code must be at least 2 characters")
    .max(20)
    .regex(/^[A-Z0-9_-]+$/, "Code must contain only uppercase alphanumeric characters, dashes, or underscores"),
  registration_number: z.string().max(80).optional().nullable(),
  society_type: societyTypeEnum.default("COOPERATIVE_HOUSING"),
  logo_url: z.string().url("Invalid URL format").optional().nullable(),
  address_line_1: z.string().max(200).optional().nullable(),
  address_line_2: z.string().max(200).optional().nullable(),
  landmark: z.string().max(120).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  district: z.string().max(100).optional().nullable(),
  state: z.string().max(100).optional().nullable(),
  pincode: z.string().regex(/^\d{5,8}$/, "Invalid postal code").optional().nullable(),
  country: z.string().default("India"),
  contact_email: z.string().email("Invalid email format").optional().nullable(),
  contact_phone: z.string().regex(/^[0-9+ -]{7,15}$/, "Invalid phone number format").optional().nullable(),
  website: z.string().url("Invalid website URL").optional().nullable(),
  timezone: z.string().default("Asia/Kolkata"),
  currency: z.string().default("INR"),
  status: societyStatusEnum.default("ACTIVE"),
});

export const societyUpdateSchema = societySchema.partial();

export type SocietyInput = z.infer<typeof societySchema>;
export type SocietyUpdateInput = z.infer<typeof societyUpdateSchema>;

