import { DeliveryStatus, DeliveryType } from "@prisma/client";
import { z } from "zod";

const deliveryTypeSchema = z.nativeEnum(DeliveryType);
const deliveryStatusSchema = z.nativeEnum(DeliveryStatus);

export const listDeliveriesQuerySchema = z.object({
  type: deliveryTypeSchema.optional(),
  status: deliveryStatusSchema.optional(),
  editorId: z.string().optional(),
  month: z.string().regex(/^\d{4}-\d{2}$/).optional(),
  isValidation: z.coerce.boolean().optional(),
  search: z.string().optional(),
});

export const createDeliverySchema = z.object({
  title: z.string().trim().min(1),
  taskId: z.string().trim().min(1).optional(),
  type: deliveryTypeSchema,
  date: z.string().date(),
  editorIds: z.array(z.string()).min(1),
  retrabalho: z.number().int().min(0).max(10).optional(),
  qualidade: z.number().int().min(0).max(10).optional(),
  prazo: z.number().int().min(0).max(10).optional(),
  bonusManual: z.number().int().min(0).optional(),
  investmentUsd: z.number().min(0).optional(),
  roas: z.number().min(0).optional(),
  isValidation: z.boolean().optional(),
});

export const updateDeliverySchema = createDeliverySchema.partial().extend({
  status: deliveryStatusSchema.optional(),
});

export type ListDeliveriesQuery = z.infer<typeof listDeliveriesQuerySchema>;
export type CreateDeliveryInput = z.infer<typeof createDeliverySchema>;
export type UpdateDeliveryInput = z.infer<typeof updateDeliverySchema>;
