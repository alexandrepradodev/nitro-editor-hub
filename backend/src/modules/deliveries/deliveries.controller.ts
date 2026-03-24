import { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import {
  createDeliverySchema,
  listDeliveriesQuerySchema,
  updateDeliverySchema,
} from "./deliveries.schema";
import {
  createDelivery,
  deleteDelivery,
  getSummary,
  listDeliveries,
  updateDelivery,
} from "./deliveries.service";

export async function listDeliveriesController(req: Request, res: Response) {
  const query = listDeliveriesQuerySchema.parse(req.query);
  const data = await listDeliveries(query);
  return res.status(200).json(data);
}

export async function createDeliveryController(req: Request, res: Response) {
  const payload = createDeliverySchema.parse(req.body);
  try {
    const created = await createDelivery(payload);
    return res.status(201).json(created);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao criar entrega";
    if (message.toLowerCase().includes("inativos")) {
      return res.status(400).json({ message });
    }
    if (message.toLowerCase().includes("nomenclatura")) {
      return res.status(400).json({ message });
    }
    if (message.toLowerCase().includes("periodo")) {
      return res.status(400).json({ message });
    }
    return res.status(500).json({ message: "Erro ao criar entrega" });
  }
}

export async function updateDeliveryController(req: Request, res: Response) {
  const payload = updateDeliverySchema.parse(req.body);
  const deliveryId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

  try {
    const updated = await updateDelivery(deliveryId, payload);
    return res.status(200).json(updated);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") {
        return res.status(404).json({ message: "Entrega nao encontrada" });
      }
      if (error.code === "P2003") {
        return res.status(400).json({ message: "Referencia invalida" });
      }
    }

    if (error instanceof Error && error.message.toLowerCase().includes("inativos")) {
      return res.status(400).json({ message: error.message });
    }
    if (error instanceof Error && error.message.toLowerCase().includes("nomenclatura")) {
      return res.status(400).json({ message: error.message });
    }
    if (error instanceof Error && error.message.toLowerCase().includes("periodo")) {
      return res.status(400).json({ message: error.message });
    }

    return res.status(500).json({ message: "Erro ao atualizar entrega" });
  }
}

export async function deleteDeliveryController(req: Request, res: Response) {
  const deliveryId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

  try {
    await deleteDelivery(deliveryId);
    return res.status(204).send();
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") {
        return res.status(404).json({ message: "Entrega nao encontrada" });
      }
      if (error.code === "P2003") {
        return res.status(400).json({ message: "Referencia invalida" });
      }
    }
    if (error instanceof Error && error.message.toLowerCase().includes("periodo")) {
      return res.status(400).json({ message: error.message });
    }

    return res.status(500).json({ message: "Erro ao excluir entrega" });
  }
}

export async function summaryController(req: Request, res: Response) {
  const month = typeof req.query.month === "string" ? req.query.month : undefined;
  if (month && !/^\d{4}-\d{2}$/.test(month)) {
    return res.status(400).json({ message: "Mes invalido" });
  }
  const data = await getSummary(month);
  return res.status(200).json(data);
}
