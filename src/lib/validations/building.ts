import * as z from "zod";

export const buildingStatusEnum = z.enum(["ACTIVE", "INACTIVE", "UNDER_MAINTENANCE"]);

export const buildingSchema = z.object({
  society_id: z.string().uuid("Invalid society ID"),
  name: z.string().min(1, "Building name is required").max(100),
  code: z
    .string()
    .min(1, "Building code is required")
    .max(20)
    .regex(/^[A-Za-z0-9_-]+$/, "Code must contain only alphanumeric characters, dashes, or underscores"),
  description: z.string().max(250).optional().nullable(),
  number_of_floors: z.number().int().min(0, "Floors must be non-negative").default(1),
  status: buildingStatusEnum.default("ACTIVE"),
});

export const buildingUpdateSchema = buildingSchema.partial().omit({ society_id: true });

export type BuildingInput = z.infer<typeof buildingSchema>;
export type BuildingUpdateInput = z.infer<typeof buildingUpdateSchema>;

