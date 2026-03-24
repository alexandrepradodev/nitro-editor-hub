import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth";
import { performanceSummaryController } from "./performance.controller";

export const performanceRoutes = Router();

performanceRoutes.use(authMiddleware);
performanceRoutes.get("/summary", performanceSummaryController);

