import { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import {
  createAdCreativeSchema,
  adCreativeRateUpdateSchema,
  listAdCreativesQuerySchema,
  updateAdCreativeSchema,
} from "./ad-creatives.schema";
import {
  createAdCreative,
  deleteAdCreative,
  getAccumulatedByEditor,
  listAdCreatives,
  listAdCreativeRates,
  updateAdCreative,
  upsertAdCreativeRate,
} from "./ad-creatives.service";

export async function listAdCreativesController(req: Request, res: Response) {
  const query = listAdCreativesQuerySchema.parse(req.query);
  const data = await listAdCreatives(query);
  return res.status(200).json(data);
}

export async function accumulatedByEditorController(req: Request, res: Response) {
  const query = listAdCreativesQuerySchema.parse(req.query);
  const data = await getAccumulatedByEditor(query);
  return res.status(200).json(data);
}

export async function listAdCreativeRatesController(_req: Request, res: Response) {
  const data = await listAdCreativeRates();
  return res.status(200).json(data);
}

export async function updateAdCreativeRateController(req: Request, res: Response) {
  const payload = adCreativeRateUpdateSchema.parse(req.body);

  try {
    await upsertAdCreativeRate(payload);
    return res.status(200).json(payload);
  } catch (_error) {
    return res.status(500).json({ message: "Erro ao atualizar rate do criativo" });
  }
}

export async function createAdCreativeController(req: Request, res: Response) {
  const payload = createAdCreativeSchema.parse(req.body);
  try {
    const created = await createAdCreative(payload);
    return res.status(201).json(created);
  } catch (error) {
    if (error instanceof Error && error.message.toLowerCase().includes("inativo")) {
      return res.status(400).json({ message: error.message });
    }
    if (error instanceof Error && error.message.toLowerCase().includes("nomenclatura")) {
      return res.status(400).json({ message: error.message });
    }
    if (error instanceof Error && error.message.toLowerCase().includes("periodo")) {
      return res.status(400).json({ message: error.message });
    }
    return res.status(500).json({ message: "Erro ao criar ad creative" });
  }
}

export async function updateAdCreativeController(req: Request, res: Response) {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const payload = updateAdCreativeSchema.parse(req.body);

  try {
    const updated = await updateAdCreative(id, payload);
    return res.status(200).json(updated);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") {
        return res.status(404).json({ message: "Ad creative nao encontrado" });
      }
      if (error.code === "P2003") {
        return res.status(400).json({ message: "Referencia invalida" });
      }
    }
    if (error instanceof Error && error.message.toLowerCase().includes("inativo")) {
      return res.status(400).json({ message: error.message });
    }
    if (error instanceof Error && error.message.toLowerCase().includes("nomenclatura")) {
      return res.status(400).json({ message: error.message });
    }
    if (error instanceof Error && error.message.toLowerCase().includes("periodo")) {
      return res.status(400).json({ message: error.message });
    }
    return res.status(500).json({ message: "Erro ao atualizar ad creative" });
  }
}

export async function deleteAdCreativeController(req: Request, res: Response) {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  try {
    await deleteAdCreative(id);
    return res.status(204).send();
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") {
        return res.status(404).json({ message: "Ad creative nao encontrado" });
      }
      if (error.code === "P2003") {
        return res.status(400).json({ message: "Referencia invalida" });
      }
    }
    if (error instanceof Error && error.message.toLowerCase().includes("periodo")) {
      return res.status(400).json({ message: error.message });
    }
    return res.status(500).json({ message: "Erro ao excluir ad creative" });
  }
}

