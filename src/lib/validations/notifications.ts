import { z } from "zod";

export const NotificationCategoryEnum = z.enum([
  "SECURITY",
  "BILLING",
  "COMPLAINTS",
  "NOTICES",
  "AMENITIES",
  "EVENTS",
  "GENERAL",
]);

export const NotificationPreferencesSchema = z.object({
  category: NotificationCategoryEnum,
  email_enabled: z.boolean().optional(),
  sms_enabled: z.boolean().optional(),
  whatsapp_enabled: z.boolean().optional(),
  in_app_enabled: z.boolean().optional(),
});

export const UpdateNotificationPreferencesSchema = z.object({
  preferences: z.array(NotificationPreferencesSchema),
});

export const BroadcastNotificationSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").max(120),
  body: z.string().min(5, "Body must be at least 5 characters").max(1000),
  category: NotificationCategoryEnum.default("GENERAL"),
  action_url: z.string().url().or(z.string().startsWith("/")).optional().nullable(),
  target_role: z.string().max(50).optional().nullable(),
});

export const NotificationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  category: NotificationCategoryEnum.optional(),
  unreadOnly: z.enum(["true", "false"]).optional(),
});
