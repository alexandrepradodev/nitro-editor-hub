import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth";
import {
  closePeriodController,
  closedPeriodByMonthController,
  closingExportController,
  closingSummaryController,
  listClosedPeriodsController,
} from "./closing.controller";

export const closingRoutes = Router();

closingRoutes.use(authMiddleware);
closingRoutes.get("/summary", closingSummaryController);
closingRoutes.get("/export", closingExportController);
closingRoutes.post("/close", closePeriodController);
closingRoutes.get("/periods", listClosedPeriodsController);
closingRoutes.get("/periods/:month", closedPeriodByMonthController);
