import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth";
import {
  createRateController,
  deleteRateController,
  listRatesController,
  updateRateController,
} from "./rates.controller";

export const ratesRoutes = Router();

ratesRoutes.use(authMiddleware);

ratesRoutes.get("/", listRatesController);
ratesRoutes.post("/", createRateController);
ratesRoutes.patch("/:type", updateRateController);
ratesRoutes.delete("/:type", deleteRateController);
