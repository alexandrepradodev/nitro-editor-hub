import { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import {
  createEditorSchema,
  updateEditorStatusSchema,
  updateEditorSchema,
} from "./editors.schema";
import {
  createEditor,
  listEditors,
  updateEditor,
  updateEditorStatus,
} from "./editors.service";

function isUniqueInitialsErrorMessage(message: string) {
  return message.toLowerCase().includes("nickname ja cadastrado");
}

export async function listEditorsController(_req: Request, res: Response) {
  const data = await listEditors();
  return res.status(200).json(data);
}

export async function createEditorController(req: Request, res: Response) {
  const payload = createEditorSchema.parse(req.body);

  try {
    const created = await createEditor(payload);
    return res.status(201).json(created);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao criar editor";
    if (isUniqueInitialsErrorMessage(message)) {
      return res.status(409).json({ message });
    }
    return res.status(500).json({ message });
  }
}

export async function updateEditorController(req: Request, res: Response) {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const payload = updateEditorSchema.parse(req.body);

  try {
    const updated = await updateEditor(id, payload);
    return res.status(200).json(updated);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") {
        return res.status(404).json({ message: "Editor nao encontrado" });
      }
      if (error.code === "P2003") {
        return res.status(400).json({ message: "Referencia invalida" });
      }
    }

    const message = error instanceof Error ? error.message : "Erro ao atualizar editor";
    if (isUniqueInitialsErrorMessage(message)) return res.status(409).json({ message });

    return res.status(500).json({ message });
  }
}

export async function updateEditorStatusController(req: Request, res: Response) {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const payload = updateEditorStatusSchema.parse(req.body);

  try {
    const updated = await updateEditorStatus(id, payload);
    return res.status(200).json(updated);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") return res.status(404).json({ message: "Editor nao encontrado" });
      if (error.code === "P2003") return res.status(400).json({ message: "Referencia invalida" });
    }

    const message = error instanceof Error ? error.message : "Erro ao atualizar status do editor";
    return res.status(500).json({ message });
  }
}

