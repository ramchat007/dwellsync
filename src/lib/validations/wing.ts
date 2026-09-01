import * as z from "zod";

export const wingStatusEnum = z.enum(["ACTIVE", "INACTIVE"]);

export const wingSchema = z.object({
  society_id: z.string().uuid("Invalid society ID"),
  building_id: z.string().uuid("Invalid building ID"),
  name: z.string().min(1, "Wing name is required").max(100),
  code: z
    .string()
    .min(1, "Wing code is required")
    .max(20)
    .regex(/^[A-Za-z0-9_-]+$/, "Code must contain only alphanumeric characters, dashes, or underscores"),
  description: z.string().max(250).optional().nullable(),
  status: wingStatusEnum.default("ACTIVE"),
});

export const wingUpdateSchema = wingSchema.partial().omit({ society_id: true, building_id: true });

export type WingInput = z.infer<typeof wingSchema>;
export type WingUpdateInput = z.infer<typeof wingUpdateSchema>;

