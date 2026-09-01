import * as z from "zod";
import { societyTypeEnum } from "./society";

export const onboardingSchema = z.object({
  // Step 1: Basic Information
  name: z.string().min(2, "Society name must be at least 2 characters").max(120),
  code: z
    .string()
    .min(2, "Code must be at least 2 characters")
    .max(20)
    .regex(/^[A-Z0-9_-]+$/, "Code must contain only uppercase alphanumeric characters, dashes, or underscores"),
  registration_number: z.string().max(80).optional().nullable(),
  society_type: societyTypeEnum.default("COOPERATIVE_HOUSING"),
  logo_url: z.string().url("Invalid URL format").optional().nullable(),

  // Step 2: Address
  address_line_1: z.string().min(1, "Address Line 1 is required").max(200),
  address_line_2: z.string().max(200).optional().nullable(),
  landmark: z.string().max(120).optional().nullable(),
  city: z.string().min(1, "City is required").max(100),
  district: z.string().max(100).optional().nullable(),
  state: z.string().min(1, "State is required").max(100),
  pincode: z.string().regex(/^\d{5,8}$/, "Invalid postal/pincode format"),
  country: z.string().default("India"),
  contact_email: z.string().email("Invalid email format").optional().nullable(),
  contact_phone: z.string().regex(/^[0-9+ -]{7,15}$/, "Invalid phone format").optional().nullable(),
  website: z.string().url("Invalid URL format").optional().nullable(),

  // Step 3: Society Configuration
  timezone: z.string().default("Asia/Kolkata"),
  currency: z.string().default("INR"),

  // Step 4: Initial Structure (Optional towers to pre-create)
  towers: z
    .array(
      z.object({
        name: z.string().min(1, "Tower name required"),
        code: z.string().min(1, "Tower code required"),
        number_of_floors: z.number().int().min(1).default(1),
        units_per_floor: z.number().int().min(1).default(4),
      })
    )
    .optional(),

  // Step 5: Initial Administrator
  admin_full_name: z.string().min(1, "Admin full name is required").max(100),
  admin_email: z.string().email("Valid admin email is required"),
  admin_phone: z.string().regex(/^[0-9+ -]{7,15}$/, "Invalid admin phone format").optional().nullable(),
  admin_password: z.string().min(8, "Password must be at least 8 characters").default("TestPassword@123"),
});

export type OnboardingInput = z.infer<typeof onboardingSchema>;

