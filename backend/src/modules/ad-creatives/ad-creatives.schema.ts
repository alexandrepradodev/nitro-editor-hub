import { z } from "zod";

export const plataformaSchema = z.string().trim().min(1).max(20);
export const adCreativeMediaTypeSchema = z.enum(["Video", "Image"]);

export const listAdCreativesQuerySchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/).optional(),
  isValidation: z.coerce.boolean().optional(),
});

export const createAdCreativeSchema = z.object({
  editorId: z.string().trim().min(1),
  projeto: z.string().trim().min(1).max(120),
  leva: z.string().trim().min(1).max(120),
  plataforma: plataformaSchema.default("FB"),
  mediaType: adCreativeMediaTypeSchema,
  quantidade: z.number().int().min(1).max(100000).default(1),
  lineTotalValue: z.number().int().min(0).optional(),
  taskCode: z.string().trim().min(1).optional(),
  date: z.string().date(),
  observacoes: z.string().trim().max(1000).optional(),
  investmentUsd: z.number().min(0).optional(),
  roas: z.number().min(0).optional(),
  isValidation: z.boolean().optional(),
});

export const updateAdCreativeSchema = createAdCreativeSchema.partial();

export type ListAdCreativesQuery = z.infer<typeof listAdCreativesQuerySchema>;
export type CreateAdCreativeInput = z.infer<typeof createAdCreativeSchema>;
export type UpdateAdCreativeInput = z.infer<typeof updateAdCreativeSchema>;

export const adCreativeRateUpdateSchema = z.object({
  mediaType: adCreativeMediaTypeSchema,
  baseValue: z.number().int().min(0),
});

