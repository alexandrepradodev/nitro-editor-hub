import { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import {
  createQualityBatchSchema,
  listQualityBatchesQuerySchema,
  qualityBatchItemParamsSchema,
  qualityBatchParamsSchema,
  qualitySummaryQuerySchema,
  updateQualityBatchItemSchema,
  updateQualityBatchSchema,
} from "./quality.schema";
import {
  createQualityBatch,
  deleteQualityBatch,
  deleteQualityBatchItem,
  getQualitySummary,
  listQualityBatches,
  updateQualityBatch,
  updateQualityBatchItem,
} from "./quality.service";

export async function createQualityBatchController(req: Request, res: Response) {
  const payload = createQualityBatchSchema.parse(req.body);
  const data = await createQualityBatch(payload);
  return res.status(201).json(data);
}

export async function listQualityBatchesController(req: Request, res: Response) {
  const query = listQualityBatchesQuerySchema.parse(req.query);
  const data = await listQualityBatches(query);
  return res.status(200).json(data);
}

export async function qualitySummaryController(req: Request, res: Response) {
  const query = qualitySummaryQuerySchema.parse(req.query);
  const data = await getQualitySummary(query);
  return res.status(200).json(data);
}

export async function updateQualityBatchController(req: Request, res: Response) {
  const { batchId } = qualityBatchParamsSchema.parse(req.params);
  const payload = updateQualityBatchSchema.parse(req.body);
  const data = await updateQualityBatch(batchId, payload);
  return res.status(200).json(data);
}

export async function deleteQualityBatchController(req: Request, res: Response) {
  const { batchId } = qualityBatchParamsSchema.parse(req.params);
  await deleteQualityBatch(batchId);
  return res.status(204).send();
}

export async function updateQualityBatchItemController(req: Request, res: Response) {
  const { batchId, itemId } = qualityBatchItemParamsSchema.parse(req.params);
  const payload = updateQualityBatchItemSchema.parse(req.body);
  const data = await updateQualityBatchItem(batchId, itemId, payload);
  return res.status(200).json(data);
}

export async function deleteQualityBatchItemController(req: Request, res: Response) {
  const { batchId, itemId } = qualityBatchItemParamsSchema.parse(req.params);
  await deleteQualityBatchItem(batchId, itemId);
  return res.status(204).send();
}

export function qualityControllerErrorBoundary(
  handler: (req: Request, res: Response) => Promise<Response>,
) {
  return async (req: Request, res: Response) => {
    try {
      return await handler(req, res);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
        return res.status(404).json({ message: "Registro nao encontrado" });
      }
      if (error instanceof Error && error.message.includes("inativo")) {
        return res.status(400).json({ message: error.message });
      }
      if (error instanceof Error && (error.message.includes("ao menos uma leva") || error.message.includes("sem itens"))) {
        return res.status(400).json({ message: error.message });
      }
      if (error instanceof Error && error.message.toLowerCase().includes("periodo")) {
        return res.status(400).json({ message: error.message });
      }
      return res.status(500).json({ message: "Erro em qualidade da leva" });
    }
  };
}

export const createQualityBatchHandler = qualityControllerErrorBoundary(createQualityBatchController);
export const listQualityBatchesHandler = qualityControllerErrorBoundary(listQualityBatchesController);
export const qualitySummaryHandler = qualityControllerErrorBoundary(qualitySummaryController);
export const updateQualityBatchHandler = qualityControllerErrorBoundary(updateQualityBatchController);
export const deleteQualityBatchHandler = qualityControllerErrorBoundary(deleteQualityBatchController);
export const updateQualityBatchItemHandler = qualityControllerErrorBoundary(updateQualityBatchItemController);
export const deleteQualityBatchItemHandler = qualityControllerErrorBoundary(deleteQualityBatchItemController);
