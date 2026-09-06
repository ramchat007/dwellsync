import { z } from "zod";

export const VisitorPurposeEnum = z.enum([
  "GUEST",
  "DELIVERY",
  "CAB",
  "SERVICE",
  "FAMILY",
  "OTHER",
]);

export const CreateVisitorInviteSchema = z.object({
  unit_id: z.string().uuid("Invalid unit selection."),
  visitor_name: z.string().min(2, "Visitor name must be at least 2 characters.").max(100),
  visitor_phone: z
    .string()
    .max(20)
    .optional()
    .nullable()
    .or(z.literal("")),
  purpose: VisitorPurposeEnum.default("GUEST"),
  vehicle_number: z
    .string()
    .max(30)
    .optional()
    .nullable()
    .or(z.literal("")),
  expected_arrival: z
    .string()
    .optional()
    .nullable()
    .or(z.literal("")),
  valid_until: z
    .string()
    .optional()
    .nullable()
    .or(z.literal("")),
  notes: z
    .string()
    .max(500)
    .optional()
    .nullable()
    .or(z.literal("")),
});

export const GuardWalkInVisitorSchema = z.object({
  unit_id: z.string().uuid("Invalid unit selection."),
  visitor_name: z.string().min(2, "Visitor name must be at least 2 characters.").max(100),
  visitor_phone: z
    .string()
    .max(20)
    .optional()
    .nullable()
    .or(z.literal("")),
  purpose: VisitorPurposeEnum.default("GUEST"),
  vehicle_number: z
    .string()
    .max(30)
    .optional()
    .nullable()
    .or(z.literal("")),
  gate_number: z.string().max(50).optional().default("Main Gate"),
  notes: z
    .string()
    .max(500)
    .optional()
    .nullable()
    .or(z.literal("")),
});

export const VerifyPassCodeSchema = z.object({
  pass_code: z
    .string()
    .regex(/^\d{6}$/, "Pass code must be exactly 6 digits."),
  gate_number: z.string().max(50).optional().default("Main Gate"),
});
