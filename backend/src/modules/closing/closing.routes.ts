import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth";
import {
  closePeriodController,
  closedPeriodByMonthController,
  closingSummaryController,
  listClosedPeriodsController,
} from "./closing.controller";

export const closingRoutes = Router();

closingRoutes.use(authMiddleware);
closingRoutes.get("/summary", closingSummaryController);
closingRoutes.post("/close", closePeriodController);
closingRoutes.get("/periods", listClosedPeriodsController);
closingRoutes.get("/periods/:month", closedPeriodByMonthController);
