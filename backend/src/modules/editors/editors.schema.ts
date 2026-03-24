import { z } from "zod";

const productionTypeSchema = z.enum(["VSL", "Criativos", "VSL + Criativos"]).optional();

export const createEditorSchema = z.object({
  name: z.string().trim().min(1).max(120),
  initials: z.string().trim().min(1).max(10),
  role: z.string().trim().min(1).max(80),
  salaryFixed: z.number().int().min(0).optional(),
  productionType: productionTypeSchema,
});

export const updateEditorSchema = createEditorSchema.partial();
export const updateEditorStatusSchema = z.object({
  isActive: z.boolean(),
});

export type CreateEditorInput = z.infer<typeof createEditorSchema>;
export type UpdateEditorInput = z.infer<typeof updateEditorSchema>;
export type UpdateEditorStatusInput = z.infer<typeof updateEditorStatusSchema>;

