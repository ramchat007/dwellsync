import { z } from "zod";

export const InventoryCategoryEnum = z.enum([
  "ELECTRICAL",
  "PLUMBING",
  "HOUSEKEEPING",
  "SECURITY_STATIONERY",
  "CIVIL_REPAIR",
  "HARDWARE_TOOLS",
  "GARDENING",
  "FIRE_SAFETY",
  "OFFICE_SUPPLIES",
  "OTHER",
]);

export const UnitOfMeasureEnum = z.enum([
  "PIECES",
  "METERS",
  "LITERS",
  "KGS",
  "BOXES",
  "PACKETS",
  "SETS",
  "ROLLS",
  "OTHER",
]);

export const InventoryStatusEnum = z.enum(["ACTIVE", "DISCONTINUED"]);

export const MovementTypeEnum = z.enum(["RECEIPT", "ISSUE", "ADJUSTMENT", "RETURN"]);

export const AdjustmentReasonEnum = z.enum([
  "DAMAGED_EXPIRED",
  "AUDIT_DISCREPANCY",
  "INITIAL_CORRECTION",
  "SCRAP",
  "THEFT_LOSS",
  "OTHER",
]);

export const CreateInventoryItemSchema = z.object({
  item_code: z.string().trim().max(50).optional(),
  name: z.string().trim().min(2, "Item name must be at least 2 characters").max(255),
  description: z.string().trim().max(1000).optional().nullable(),
  category: InventoryCategoryEnum,
  unit_of_measure: UnitOfMeasureEnum,
  opening_quantity: z.number().min(0, "Opening quantity cannot be negative").default(0),
  min_reorder_level: z.number().min(0, "Reorder level cannot be negative").default(0),
  unit_cost: z.number().min(0, "Unit cost cannot be negative").default(0),
  supplier_name: z.string().trim().max(255).optional().nullable(),
  supplier_contact: z.string().trim().max(100).optional().nullable(),
  storage_location: z.string().trim().max(255).optional().nullable(),
  status: InventoryStatusEnum.default("ACTIVE"),
  notes: z.string().max(1000).optional().nullable(),
});

export const UpdateInventoryItemSchema = CreateInventoryItemSchema.partial();

export const CreateStockMovementSchema = z
  .object({
    movement_type: MovementTypeEnum,
    quantity: z.number().positive("Quantity must be greater than zero"),
    unit_price: z.number().min(0).optional().default(0),
    is_reduction: z.boolean().optional().default(true),
    movement_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid movement date (YYYY-MM-DD)").optional(),
    issued_to_name: z.string().trim().max(255).optional().nullable(),
    issued_to_profile_id: z.string().uuid().optional().nullable().or(z.literal("")),
    department: z.string().trim().max(100).optional().nullable(),
    purpose: z.string().trim().max(255).optional().nullable(),
    building_id: z.string().uuid().optional().nullable().or(z.literal("")),
    unit_id: z.string().uuid().optional().nullable().or(z.literal("")),
    adjustment_reason: AdjustmentReasonEnum.optional().nullable(),
    notes: z.string().max(1000).optional().nullable(),
    expense_voucher_id: z.string().uuid().optional().nullable().or(z.literal("")),
  })
  .refine(
    (data) => {
      if (data.movement_type === "ADJUSTMENT") {
        return !!data.adjustment_reason;
      }
      return true;
    },
    {
      message: "An adjustment reason is mandatory when performing a stock adjustment.",
      path: ["adjustment_reason"],
    }
  );
