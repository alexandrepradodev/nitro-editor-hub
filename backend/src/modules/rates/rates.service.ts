import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import type { CreateRateInput, UpdateRateInput } from "./rates.schema";

export async function listRates() {
  return prisma.deliveryRate.findMany({
    orderBy: { type: "asc" },
  });
}

export async function upsertRate(input: CreateRateInput) {
  return prisma.deliveryRate.upsert({
    where: { type: input.type },
    update: { baseValue: input.baseValue },
    create: { type: input.type, baseValue: input.baseValue },
  });
}

export async function upsertRateWithMeta(input: CreateRateInput): Promise<{ rate: Awaited<ReturnType<typeof upsertRate>>; existed: boolean }> {
  const existing = await prisma.deliveryRate.findUnique({ where: { type: input.type } });
  if (existing) {
    const rate = await prisma.deliveryRate.update({
      where: { type: input.type },
      data: { baseValue: input.baseValue },
    });
    return { rate, existed: true };
  }

  const rate = await prisma.deliveryRate.create({
    data: { type: input.type, baseValue: input.baseValue },
  });
  return { rate, existed: false };
}

export async function updateRate(type: CreateRateInput["type"], input: UpdateRateInput) {
  return prisma.deliveryRate.update({
    where: { type },
    data: { baseValue: input.baseValue },
  });
}

export async function deleteRate(type: CreateRateInput["type"]) {
  await prisma.deliveryRate.delete({ where: { type } });
}

