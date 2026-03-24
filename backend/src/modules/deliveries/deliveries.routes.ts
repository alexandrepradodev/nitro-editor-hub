import { Router } from "express";
import {
  createDeliveryController,
  deleteDeliveryController,
  listDeliveriesController,
  summaryController,
  updateDeliveryController,
} from "./deliveries.controller";
import { authMiddleware } from "../../middlewares/auth";

export const deliveriesRoutes = Router();

deliveriesRoutes.use(authMiddleware);
deliveriesRoutes.get("/", listDeliveriesController);
deliveriesRoutes.get("/summary", summaryController);
deliveriesRoutes.post("/", createDeliveryController);
deliveriesRoutes.patch("/:id", updateDeliveryController);
deliveriesRoutes.delete("/:id", deleteDeliveryController);
