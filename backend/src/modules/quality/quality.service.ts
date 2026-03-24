import { prisma } from "../../lib/prisma";
import { Prisma } from "@prisma/client";
import { assertMonthIsOpen } from "../closing/closing-lock";
import type {
  CreateQualityBatchInput,
  ListQualityBatchesQuery,
  QualitySummaryQuery,
  UpdateQualityBatchInput,
  UpdateQualityBatchItemInput,
} from "./quality.schema";

function parseIsoDateOnly(isoDate: string) {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function resolveMonth(month?: string) {
  if (month) return month;
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

function calculateBonusCents(accuracyPercent: number) {
  if (accuracyPercent >= 80) return 60000;
  if (accuracyPercent >= 70) return 50000;
  if (accuracyPercent >= 60) return 40000;
  if (accuracyPercent >= 50) return 25000;
  if (accuracyPercent >= 40) return 10000;
  if (accuracyPercent >= 30) return 5000;
  return 0;
}

function toMonthRange(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  const start = new Date(Date.UTC(year, monthNumber - 1, 1));
  const end = new Date(Date.UTC(year, monthNumber, 1));
  return { start, end };
}

async function assertEditorIsActive(editorId: string) {
  const editor = await prisma.editor.findUniqueOrThrow({
    where: { id: editorId },
    select: { id: true, isActive: true },
  });
  if (!editor.isActive) {
    throw new Error("Editor inativo nao pode receber cadastro de qualidade.");
  }
}

async function assertEditorIsActiveTx(tx: Prisma.TransactionClient, editorId: string) {
  const editor = await tx.editor.findUniqueOrThrow({
    where: { id: editorId },
    select: { id: true, isActive: true },
  });
  if (!editor.isActive) {
    throw new Error("Editor inativo nao pode receber cadastro de qualidade.");
  }
}

function computeBatchMetrics(items: Array<{ note: number }>) {
  const totalLevas = items.length;
  const totalPoints = items.reduce((acc, item) => acc + item.note, 0);
  const maxPoints = totalLevas * 5;
  const accuracyPercent = maxPoints > 0 ? Math.round((totalPoints / maxPoints) * 100) : 0;
  const bonusCents = calculateBonusCents(accuracyPercent);
  return { totalLevas, totalPoints, maxPoints, accuracyPercent, bonusCents };
}

function mapBatchResponse(batch: {
  id: string;
  date: Date;
  monthKey: string;
  totalLevas: number;
  totalPoints: number;
  maxPoints: number;
  accuracyPercent: number;
  bonusCents: number;
  editor: { id: string; name: string; initials: string; colorClass: string };
  items: Array<{ id: string; project: string; levaNumber: string; format: "IG" | "GO" | "YT" | "FB"; note: number }>;
}) {
  return {
    id: batch.id,
    date: batch.date.toISOString().slice(0, 10),
    monthKey: batch.monthKey,
    editor: batch.editor,
    totalLevas: batch.totalLevas,
    totalPoints: batch.totalPoints,
    maxPoints: batch.maxPoints,
    accuracyPercent: batch.accuracyPercent,
    bonusCents: batch.bonusCents,
    items: batch.items.map((item) => ({
      id: item.id,
      project: item.project,
      levaNumber: item.levaNumber,
      format: item.format,
      note: item.note,
    })),
  };
}

async function recalculateBatchTx(tx: Prisma.TransactionClient, batchId: string) {
  const items = await tx.qualityBatchItem.findMany({
    where: { batchId },
    select: { note: true },
  });
  if (items.length === 0) {
    throw new Error("Lote nao pode ficar sem itens.");
  }
  const metrics = computeBatchMetrics(items);
  await tx.qualityBatch.update({
    where: { id: batchId },
    data: metrics,
  });
}

export async function createQualityBatch(input: CreateQualityBatchInput) {
  await assertMonthIsOpen(input.date);
  await assertEditorIsActive(input.editorId);

  const { totalLevas, totalPoints, maxPoints, accuracyPercent, bonusCents } = computeBatchMetrics(input.items);
  const monthKey = input.date.slice(0, 7);
  const date = parseIsoDateOnly(input.date);

  const created = await prisma.qualityBatch.create({
    data: {
      editorId: input.editorId,
      date,
      monthKey,
      totalLevas,
      totalPoints,
      maxPoints,
      accuracyPercent,
      bonusCents,
      items: {
        create: input.items.map((item) => ({
          project: item.project,
          levaNumber: item.levaNumber,
          format: item.format,
          note: item.note,
        })),
      },
    },
    include: {
      editor: {
        select: { id: true, name: true, initials: true, colorClass: true },
      },
      items: true,
    },
  });

  return mapBatchResponse(created);
}

export async function updateQualityBatch(batchId: string, input: UpdateQualityBatchInput) {
  const existing = await prisma.qualityBatch.findUniqueOrThrow({
    where: { id: batchId },
    select: { date: true },
  });
  await assertMonthIsOpen(existing.date);
  await assertMonthIsOpen(input.date);
  await assertEditorIsActive(input.editorId);
  const monthKey = input.date.slice(0, 7);
  const date = parseIsoDateOnly(input.date);
  const { totalLevas, totalPoints, maxPoints, accuracyPercent, bonusCents } = computeBatchMetrics(input.items);

  const updated = await prisma.$transaction(async (tx) => {
    await tx.qualityBatch.update({
      where: { id: batchId },
      data: {
        editorId: input.editorId,
        date,
        monthKey,
        totalLevas,
        totalPoints,
        maxPoints,
        accuracyPercent,
        bonusCents,
      },
    });

    await tx.qualityBatchItem.deleteMany({
      where: { batchId },
    });

    await tx.qualityBatchItem.createMany({
      data: input.items.map((item) => ({
        batchId,
        project: item.project,
        levaNumber: item.levaNumber,
        format: item.format,
        note: item.note,
      })),
    });

    return tx.qualityBatch.findUniqueOrThrow({
      where: { id: batchId },
      include: {
        editor: { select: { id: true, name: true, initials: true, colorClass: true } },
        items: { orderBy: { createdAt: "asc" } },
      },
    });
  });

  return mapBatchResponse(updated);
}

export async function deleteQualityBatch(batchId: string) {
  const existing = await prisma.qualityBatch.findUniqueOrThrow({
    where: { id: batchId },
    select: { date: true },
  });
  await assertMonthIsOpen(existing.date);
  await prisma.qualityBatch.delete({
    where: { id: batchId },
  });
}

export async function updateQualityBatchItem(batchId: string, itemId: string, input: UpdateQualityBatchItemInput) {
  const updated = await prisma.$transaction(async (tx) => {
    const batch = await tx.qualityBatch.findUniqueOrThrow({
      where: { id: batchId },
      select: { id: true, editorId: true, date: true },
    });
    await assertMonthIsOpen(batch.date, tx);
    await assertEditorIsActiveTx(tx, batch.editorId);

    const item = await tx.qualityBatchItem.findFirstOrThrow({
      where: { id: itemId, batchId },
      select: { id: true },
    });

    await tx.qualityBatchItem.update({
      where: { id: item.id },
      data: {
        project: input.project,
        levaNumber: input.levaNumber,
        format: input.format,
        note: input.note,
      },
    });

    await recalculateBatchTx(tx, batchId);

    return tx.qualityBatch.findUniqueOrThrow({
      where: { id: batchId },
      include: {
        editor: { select: { id: true, name: true, initials: true, colorClass: true } },
        items: { orderBy: { createdAt: "asc" } },
      },
    });
  });

  return mapBatchResponse(updated);
}

export async function deleteQualityBatchItem(batchId: string, itemId: string) {
  await prisma.$transaction(async (tx) => {
    const batch = await tx.qualityBatch.findUniqueOrThrow({
      where: { id: batchId },
      select: { id: true, editorId: true, date: true },
    });
    await assertMonthIsOpen(batch.date, tx);
    await assertEditorIsActiveTx(tx, batch.editorId);

    const count = await tx.qualityBatchItem.count({ where: { batchId } });
    if (count <= 1) {
      throw new Error("Lote precisa ter ao menos uma leva.");
    }

    const item = await tx.qualityBatchItem.findFirstOrThrow({
      where: { id: itemId, batchId },
      select: { id: true },
    });
    await tx.qualityBatchItem.delete({ where: { id: item.id } });

    await recalculateBatchTx(tx, batchId);
  });
}

export async function listQualityBatches(query: ListQualityBatchesQuery) {
  const month = resolveMonth(query.month);
  const { start, end } = toMonthRange(month);

  const batches = await prisma.qualityBatch.findMany({
    where: {
      date: { gte: start, lt: end },
      ...(query.editorId ? { editorId: query.editorId } : {}),
    },
    include: {
      editor: { select: { id: true, name: true, initials: true, colorClass: true } },
      items: { orderBy: { createdAt: "asc" } },
    },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  });

  const byEditor = new Map<string, {
    editorId: string;
    editorName: string;
    editorInitials: string;
    editorColorClass: string;
    totalLevas: number;
    totalPoints: number;
    maxPoints: number;
    bonusCents: number;
  }>();

  for (const batch of batches) {
    const current = byEditor.get(batch.editorId) ?? {
      editorId: batch.editorId,
      editorName: batch.editor.name,
      editorInitials: batch.editor.initials,
      editorColorClass: batch.editor.colorClass,
      totalLevas: 0,
      totalPoints: 0,
      maxPoints: 0,
      bonusCents: 0,
    };

    current.totalLevas += batch.totalLevas;
    current.totalPoints += batch.totalPoints;
    current.maxPoints += batch.maxPoints;
    current.bonusCents += batch.bonusCents;
    byEditor.set(batch.editorId, current);
  }

  const rows = Array.from(byEditor.values()).map((row) => {
    const accuracyPercent = row.maxPoints > 0 ? Number(((row.totalPoints / row.maxPoints) * 100).toFixed(1)) : 0;
    return { ...row, accuracyPercent };
  });

  return {
    month,
    rows,
    batches: batches.map((batch) => ({
      id: batch.id,
      editorId: batch.editorId,
      editorName: batch.editor.name,
      editorInitials: batch.editor.initials,
      editorColorClass: batch.editor.colorClass,
      date: batch.date.toISOString().slice(0, 10),
      totalLevas: batch.totalLevas,
      totalPoints: batch.totalPoints,
      maxPoints: batch.maxPoints,
      accuracyPercent: batch.accuracyPercent,
      bonusCents: batch.bonusCents,
      items: batch.items.map((item) => ({
        id: item.id,
        project: item.project,
        levaNumber: item.levaNumber,
        format: item.format,
        note: item.note,
      })),
    })),
  };
}

export async function getQualitySummary(query: QualitySummaryQuery) {
  const month = resolveMonth(query.month);
  const { start, end } = toMonthRange(month);

  const aggregate = await prisma.qualityBatch.aggregate({
    where: { date: { gte: start, lt: end } },
    _sum: {
      totalLevas: true,
      totalPoints: true,
      maxPoints: true,
      bonusCents: true,
    },
    _count: {
      id: true,
    },
  });

  const editorsCount = await prisma.qualityBatch.groupBy({
    by: ["editorId"],
    where: { date: { gte: start, lt: end } },
  });

  const totalLevas = aggregate._sum.totalLevas ?? 0;
  const totalPoints = aggregate._sum.totalPoints ?? 0;
  const maxPoints = aggregate._sum.maxPoints ?? 0;
  const accuracyPercent = maxPoints > 0 ? Number(((totalPoints / maxPoints) * 100).toFixed(1)) : 0;
  const bonusCents = aggregate._sum.bonusCents ?? 0;

  return {
    month,
    points: totalPoints,
    maxPoints,
    accuracyPercent,
    totalLevas,
    bonusCents,
    totalBatches: aggregate._count.id,
    totalEditors: editorsCount.length,
  };
}
