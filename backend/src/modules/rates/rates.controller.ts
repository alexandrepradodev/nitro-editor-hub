import { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { createRateSchema, rateTypeParamSchema, updateRateSchema } from "./rates.schema";
import { deleteRate, listRates, updateRate, upsertRateWithMeta } from "./rates.service";

export async function listRatesController(_req: Request, res: Response) {
  const data = await listRates();
  return res.status(200).json(data);
}

export async function createRateController(req: Request, res: Response) {
  const payload = createRateSchema.parse(req.body);
  const { rate, existed } = await upsertRateWithMeta(payload);
  return res.status(existed ? 200 : 201).json(rate);
}

export async function updateRateController(req: Request, res: Response) {
  const payload = updateRateSchema.parse(req.body);
  const type = rateTypeParamSchema.parse(req.params).type;

  try {
    const updated = await updateRate(type, payload);
    return res.status(200).json(updated);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") return res.status(404).json({ message: "Rate nao encontrada" });
      if (error.code === "P2003") return res.status(400).json({ message: "Referencia invalida" });
    }
    return res.status(500).json({ message: "Erro ao atualizar rate" });
  }
}

export async function deleteRateController(req: Request, res: Response) {
  const type = rateTypeParamSchema.parse(req.params).type;

  try {
    await deleteRate(type);
    return res.status(204).send();
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") return res.status(404).json({ message: "Rate nao encontrada" });
      if (error.code === "P2003") return res.status(400).json({ message: "Referencia invalida" });
    }
    return res.status(500).json({ message: "Erro ao deletar rate" });
  }
}

