import * as z from "zod";

export const unitTypeEnum = z.enum([
  "1_BHK",
  "2_BHK",
  "3_BHK",
  "4_BHK",
  "PENTHOUSE",
  "SHOP",
  "OFFICE",
  "PARKING",
  "OTHER",
]);

export const unitStatusEnum = z.enum([
  "ACTIVE",
  "VACANT",
  "OCCUPIED",
  "UNDER_MAINTENANCE",
  "INACTIVE",
]);

export const unitSchema = z.object({
  society_id: z.string().uuid("Invalid society ID"),
  building_id: z.string().uuid("Invalid building ID"),
  wing_id: z.string().uuid("Invalid wing ID").optional().nullable(),
  floor_id: z.string().uuid("Invalid floor ID").optional().nullable(),
  unit_number: z.string().min(1, "Unit / Flat number is required").max(30),
  unit_type: unitTypeEnum.default("2_BHK"),
  area_sqft: z.number().positive("Area must be positive").optional().nullable(),
  carpet_area_sqft: z.number().positive("Carpet area must be positive").optional().nullable(),
  built_up_area_sqft: z.number().positive("Built-up area must be positive").optional().nullable(),
  status: unitStatusEnum.default("VACANT"),
});

export const unitUpdateSchema = unitSchema.partial().omit({ society_id: true, building_id: true });

export const unitBatchGenerationSchema = z.object({
  society_id: z.string().uuid("Invalid society ID"),
  building_id: z.string().uuid("Invalid building ID"),
  wing_id: z.string().uuid("Invalid wing ID").optional().nullable(),
  start_floor: z.number().int().min(-5).max(150).default(1),
  end_floor: z.number().int().min(1).max(150).default(5),
  units_per_floor: z.number().int().min(1).max(50).default(4),
  prefix: z.string().max(10).default(""),
  unit_type: unitTypeEnum.default("2_BHK"),
  area_sqft: z.number().positive().optional().nullable(),
  pattern: z.string().default("{prefix}{floor}{unit}"), // e.g. A-101, A-102 or 101, 102
});

export type UnitInput = z.infer<typeof unitSchema>;
export type UnitUpdateInput = z.infer<typeof unitUpdateSchema>;
export type UnitBatchGenerationInput = z.infer<typeof unitBatchGenerationSchema>;
