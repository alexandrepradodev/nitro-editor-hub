import type { Request, Response } from "express";
import { performanceSummaryQuerySchema } from "./performance.schema";
import { getPerformanceSummary } from "./performance.service";

export async function performanceSummaryController(req: Request, res: Response) {
  const query = performanceSummaryQuerySchema.parse(req.query);
  const data = await getPerformanceSummary(query);
  return res.status(200).json(data);
}

