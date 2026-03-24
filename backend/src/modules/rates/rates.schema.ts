import { DeliveryType } from "@prisma/client";
import { z } from "zod";

const deliveryTypeSchema = z.nativeEnum(DeliveryType);

export const createRateSchema = z.object({
  type: deliveryTypeSchema,
  baseValue: z.number().int().min(0),
});

export const updateRateSchema = z.object({
  baseValue: z.number().int().min(0),
});

export type CreateRateInput = z.infer<typeof createRateSchema>;
export type UpdateRateInput = z.infer<typeof updateRateSchema>;

export const rateTypeParamSchema = z.object({
  type: deliveryTypeSchema,
});

