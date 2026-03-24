import { z } from "zod";

export const qualityLevaFormatSchema = z.enum(["IG", "GO", "YT", "FB"]);

export const createQualityBatchSchema = z.object({
  editorId: z.string().trim().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  items: z
    .array(
      z.object({
        project: z.string().trim().min(1).max(200),
        levaNumber: z.string().trim().min(1).max(60),
        format: qualityLevaFormatSchema,
        note: z.number().int().min(1).max(5),
      }),
    )
    .min(1)
    .max(30),
});

export const listQualityBatchesQuerySchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/).optional(),
  editorId: z.string().trim().min(1).optional(),
});

export const qualitySummaryQuerySchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/).optional(),
});

export const qualityBatchParamsSchema = z.object({
  batchId: z.string().trim().min(1),
});

export const qualityBatchItemParamsSchema = z.object({
  batchId: z.string().trim().min(1),
  itemId: z.string().trim().min(1),
});

export const updateQualityBatchSchema = z.object({
  editorId: z.string().trim().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  items: z
    .array(
      z.object({
        project: z.string().trim().min(1).max(200),
        levaNumber: z.string().trim().min(1).max(60),
        format: qualityLevaFormatSchema,
        note: z.number().int().min(1).max(5),
      }),
    )
    .min(1)
    .max(30),
});

export const updateQualityBatchItemSchema = z.object({
  project: z.string().trim().min(1).max(200),
  levaNumber: z.string().trim().min(1).max(60),
  format: qualityLevaFormatSchema,
  note: z.number().int().min(1).max(5),
});

export type CreateQualityBatchInput = z.infer<typeof createQualityBatchSchema>;
export type ListQualityBatchesQuery = z.infer<typeof listQualityBatchesQuerySchema>;
export type QualitySummaryQuery = z.infer<typeof qualitySummaryQuerySchema>;
export type QualityBatchParams = z.infer<typeof qualityBatchParamsSchema>;
export type QualityBatchItemParams = z.infer<typeof qualityBatchItemParamsSchema>;
export type UpdateQualityBatchInput = z.infer<typeof updateQualityBatchSchema>;
export type UpdateQualityBatchItemInput = z.infer<typeof updateQualityBatchItemSchema>;
