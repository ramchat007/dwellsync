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
  super_built_up_area_sqft: z.number().positive("Super built-up area must be positive").optional().nullable(),
  bedrooms: z.number().int().min(0).optional().nullable(),
  bathrooms: z.number().int().min(0).optional().nullable(),
  balconies: z.number().int().min(0).optional().nullable(),
  parking_slots: z.number().int().min(0).optional().nullable(),
  monthly_maintenance_override: z.number().min(0).optional().nullable(),
  intercom_number: z.string().max(50).optional().nullable(),
  meter_number_electricity: z.string().max(50).optional().nullable(),
  meter_number_gas: z.string().max(50).optional().nullable(),
  meter_number_water: z.string().max(50).optional().nullable(),
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

export type UnitInput = z.input<typeof unitSchema>;
export type UnitOutput = z.output<typeof unitSchema>;
export type UnitUpdateInput = z.input<typeof unitUpdateSchema>;
export type UnitBatchGenerationInput = z.infer<typeof unitBatchGenerationSchema>;
