import * as z from "zod";

export const floorStatusEnum = z.enum(["ACTIVE", "INACTIVE"]);

export const floorSchema = z.object({
  society_id: z.string().uuid("Invalid society ID"),
  building_id: z.string().uuid("Invalid building ID"),
  wing_id: z.string().uuid("Invalid wing ID").optional().nullable(),
  name: z.string().min(1, "Floor name is required").max(60),
  floor_number: z.number().int(),
  display_order: z.number().int().default(0),
  status: floorStatusEnum.default("ACTIVE"),
});

export const floorUpdateSchema = floorSchema.partial().omit({ society_id: true, building_id: true });

export type FloorInput = z.infer<typeof floorSchema>;
export type FloorUpdateInput = z.infer<typeof floorUpdateSchema>;

