import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth";
import {
  accumulatedByEditorController,
  createAdCreativeController,
  deleteAdCreativeController,
  listAdCreativesController,
  listAdCreativeRatesController,
  updateAdCreativeController,
  updateAdCreativeRateController,
} from "./ad-creatives.controller";

export const adCreativesRoutes = Router();

adCreativesRoutes.use(authMiddleware);

adCreativesRoutes.get("/", listAdCreativesController);
adCreativesRoutes.get("/accumulated", accumulatedByEditorController);
adCreativesRoutes.get("/rates", listAdCreativeRatesController);
adCreativesRoutes.patch("/rate", updateAdCreativeRateController);
adCreativesRoutes.post("/", createAdCreativeController);
adCreativesRoutes.patch("/:id", updateAdCreativeController);
adCreativesRoutes.delete("/:id", deleteAdCreativeController);

