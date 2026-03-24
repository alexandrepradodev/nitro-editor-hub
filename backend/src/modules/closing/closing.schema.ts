import { z } from "zod";

export const closingSummaryQuerySchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/).optional(),
});

export type ClosingSummaryQuery = z.infer<typeof closingSummaryQuerySchema>;

export const closePeriodSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/),
});

export const closingPeriodParamsSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/),
});

export type ClosePeriodInput = z.infer<typeof closePeriodSchema>;
