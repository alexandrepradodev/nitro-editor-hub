import { Prisma, Editor } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import type { CreateEditorInput, UpdateEditorInput, UpdateEditorStatusInput } from "./editors.schema";

const COLOR_CLASSES = ["c-cyan", "c-violet", "c-yellow", "c-orange", "c-green"] as const;

export function getColorClassFromInitials(initialsRaw: string): (typeof COLOR_CLASSES)[number] {
  const initials = initialsRaw.trim().toUpperCase();
  let sum = 0;
  for (let i = 0; i < initials.length; i++) sum += initials.charCodeAt(i);
  const idx = sum % COLOR_CLASSES.length;
  return COLOR_CLASSES[idx];
}

export async function listEditors(): Promise<Editor[]> {
  return prisma.editor.findMany({
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
  });
}

export async function createEditor(input: CreateEditorInput): Promise<Editor> {
  const colorClass = getColorClassFromInitials(input.initials);

  try {
    return await prisma.editor.create({
      data: {
        name: input.name,
        initials: input.initials,
        role: input.role,
        colorClass,
        salaryFixed: input.salaryFixed ?? undefined,
        productionType: input.productionType ?? undefined,
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      // Unica: initials
      throw new Error("Nickname ja cadastrado");
    }
    throw error;
  }
}

export async function updateEditor(id: string, input: UpdateEditorInput): Promise<Editor> {
  try {
    return await prisma.editor.update({
      where: { id },
      data: {
        name: input.name ?? undefined,
        initials: input.initials ?? undefined,
        role: input.role ?? undefined,
        // Gera cor deterministica apenas quando o nickname (iniciais) muda.
        colorClass: input.initials ? getColorClassFromInitials(input.initials) : undefined,
        salaryFixed: input.salaryFixed ?? undefined,
        productionType: input.productionType ?? undefined,
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new Error("Nickname ja cadastrado");
    }
    throw error;
  }
}

export async function updateEditorStatus(id: string, input: UpdateEditorStatusInput): Promise<Editor> {
  return prisma.editor.update({
    where: { id },
    data: { isActive: input.isActive },
  });
}

