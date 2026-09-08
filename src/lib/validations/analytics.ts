import { z } from "zod";

export const AnalyticsTimeframeEnum = z.enum(["7d", "30d", "90d", "year", "all"]);
export type AnalyticsTimeframe = z.infer<typeof AnalyticsTimeframeEnum>;

export const AnalyticsQuerySchema = z.object({
  timeframe: AnalyticsTimeframeEnum.default("30d"),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export type AnalyticsQuery = z.infer<typeof AnalyticsQuerySchema>;

export const SocietyAnalyticsQuerySchema = AnalyticsQuerySchema;
export type SocietyAnalyticsQuery = AnalyticsQuery;

export const PlatformAnalyticsQuerySchema = AnalyticsQuerySchema;
export type PlatformAnalyticsQuery = AnalyticsQuery;

