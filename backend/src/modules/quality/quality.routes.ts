import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth";
import {
  createQualityBatchHandler,
  deleteQualityBatchHandler,
  deleteQualityBatchItemHandler,
  listQualityBatchesHandler,
  qualitySummaryHandler,
  updateQualityBatchHandler,
  updateQualityBatchItemHandler,
} from "./quality.controller";

export const qualityRoutes = Router();

qualityRoutes.use(authMiddleware);
qualityRoutes.get("/batches", listQualityBatchesHandler);
qualityRoutes.get("/summary", qualitySummaryHandler);
qualityRoutes.post("/batches", createQualityBatchHandler);
qualityRoutes.patch("/batches/:batchId", updateQualityBatchHandler);
qualityRoutes.delete("/batches/:batchId", deleteQualityBatchHandler);
qualityRoutes.patch("/batches/:batchId/items/:itemId", updateQualityBatchItemHandler);
qualityRoutes.delete("/batches/:batchId/items/:itemId", deleteQualityBatchItemHandler);
