import * as z from "zod";

export const ownershipTypeEnum = z.enum([
  "PRIMARY",
  "JOINT",
  "INHERITED",
  "CORPORATE",
  "OTHER",
]);

export const ownershipStatusEnum = z.enum(["ACTIVE", "HISTORICAL", "DISPUTED"]);

export const occupancyTypeEnum = z.enum([
  "OWNER_OCCUPIED",
  "TENANT_OCCUPIED",
  "FAMILY_OCCUPIED",
]);

export const occupancyStatusEnum = z.enum(["ACTIVE", "EXPIRED", "TERMINATED"]);

export const familyRelationshipEnum = z.enum([
  "SPOUSE",
  "CHILD",
  "PARENT",
  "SIBLING",
  "OTHER",
]);

export const unitOwnerSchema = z.object({
  society_id: z.string().uuid("Invalid society ID"),
  unit_id: z.string().uuid("Invalid unit ID"),
  user_id: z.string().uuid("Invalid user ID"),
  is_primary: z.boolean().default(true),
  ownership_percentage: z
    .number()
    .min(0.01, "Ownership percentage must be positive")
    .max(100, "Ownership cannot exceed 100%")
    .default(100),
  ownership_type: ownershipTypeEnum.default("PRIMARY"),
  start_date: z.string().optional().nullable(),
  end_date: z.string().optional().nullable(),
  status: ownershipStatusEnum.default("ACTIVE"),
});

export const unitOccupancySchema = z.object({
  society_id: z.string().uuid("Invalid society ID"),
  unit_id: z.string().uuid("Invalid unit ID"),
  user_id: z.string().uuid("Invalid user ID"),
  occupancy_type: occupancyTypeEnum.default("TENANT_OCCUPIED"),
  lease_start: z.string().optional().nullable(),
  lease_end: z.string().optional().nullable(),
  is_primary_tenant: z.boolean().default(true),
  status: occupancyStatusEnum.default("ACTIVE"),
});

export const familyMemberSchema = z.object({
  society_id: z.string().uuid("Invalid society ID"),
  unit_id: z.string().uuid("Invalid unit ID"),
  primary_member_id: z.string().uuid("Invalid primary member ID"),
  full_name: z.string().min(1, "Full name is required").max(100),
  relationship: familyRelationshipEnum.default("SPOUSE"),
  phone: z.string().regex(/^[0-9+ -]{7,15}$/, "Invalid phone format").optional().nullable(),
  email: z.string().email("Invalid email format").optional().nullable(),
  is_emergency_contact: z.boolean().default(false),
});

export type UnitOwnerInput = z.infer<typeof unitOwnerSchema>;
export type UnitOccupancyInput = z.infer<typeof unitOccupancySchema>;
export type FamilyMemberInput = z.infer<typeof familyMemberSchema>;

