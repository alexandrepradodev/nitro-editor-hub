import type { Request, Response } from "express";
import { closePeriodSchema, closingPeriodParamsSchema, closingSummaryQuerySchema } from "./closing.schema";
import { exportClosingSpreadsheet } from "./closing-export.service";
import { closePeriod, getClosedPeriodByMonth, getClosingSummary, listClosedPeriods } from "./closing.service";

export async function closingSummaryController(req: Request, res: Response) {
  const query = closingSummaryQuerySchema.parse(req.query);
  const data = await getClosingSummary(query);
  return res.status(200).json(data);
}

export async function closingExportController(req: Request, res: Response) {
  try {
    const query = closingSummaryQuerySchema.parse(req.query);
    const { buffer, monthKey } = await exportClosingSpreadsheet(query);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="fechamento_${monthKey}.xlsx"`);
    return res.send(buffer);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Erro ao gerar exportacao" });
  }
}

export async function closePeriodController(req: Request, res: Response) {
  const payload = closePeriodSchema.parse(req.body);
  const userId = req.user?.sub;
  if (!userId) {
    return res.status(401).json({ message: "Token invalido" });
  }
  try {
    const data = await closePeriod(payload.month, userId);
    return res.status(201).json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao fechar periodo";
    if (message.toLowerCase().includes("ja foi fechado")) {
      return res.status(400).json({ message });
    }
    return res.status(500).json({ message: "Erro ao fechar periodo" });
  }
}

export async function listClosedPeriodsController(_req: Request, res: Response) {
  const data = await listClosedPeriods();
  return res.status(200).json(data);
}

export async function closedPeriodByMonthController(req: Request, res: Response) {
  const { month } = closingPeriodParamsSchema.parse(req.params);
  const data = await getClosedPeriodByMonth(month);
  if (!data) {
    return res.status(404).json({ message: "Fechamento nao encontrado para o periodo" });
  }
  return res.status(200).json(data);
}
