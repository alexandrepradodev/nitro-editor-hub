import { DeliveryStatus, DeliveryType, Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { splitCents } from "../../lib/split-bonus";
import { CreateDeliveryInput, ListDeliveriesQuery, UpdateDeliveryInput } from "./deliveries.schema";
import { assertMonthIsOpen } from "../closing/closing-lock";

function getTier(total: number) {
  if (total >= 24) return { pct: 1, label: "Tier 100%" };
  if (total >= 21) return { pct: 0.8, label: "Tier 80%" };
  if (total >= 18) return { pct: 0.6, label: "Tier 60%" };
  if (total >= 15) return { pct: 0.4, label: "Tier 40%" };
  return { pct: 0, label: "< 15pts" };
}

async function getBaseRate(type: DeliveryType): Promise<number> {
  const rate = await prisma.deliveryRate.findUnique({ where: { type } });
  if (!rate) throw new Error("Tipo sem rate configurado");
  return rate.baseValue;
}

function hasKpiValues(data: { retrabalho?: number; qualidade?: number; prazo?: number }) {
  return (
    typeof data.retrabalho === "number" &&
    typeof data.qualidade === "number" &&
    typeof data.prazo === "number"
  );
}

type DeliveryInputForCalc = {
  type: DeliveryType;
  baseValue: number;
  retrabalho?: number;
  qualidade?: number;
  prazo?: number;
};

type DeliveryWithEditors = Prisma.DeliveryGetPayload<{
  include: { editors: true };
}>;

function normalizeValidationName(value: string) {
  return value.trim().toLowerCase();
}

function isValidationDeliveryType(type: DeliveryType): type is "VSL" | "Troca" | "Lead" {
  return type === DeliveryType.VSL || type === DeliveryType.Troca || type === DeliveryType.Lead;
}

async function assertValidationNameIsUniqueForDelivery(params: { title: string; ignoreDeliveryId?: string }) {
  const normalized = normalizeValidationName(params.title);
  if (!normalized) return;

  const [deliveries, creatives] = await Promise.all([
    prisma.delivery.findMany({
      where: {
        type: { in: [DeliveryType.VSL, DeliveryType.Troca, DeliveryType.Lead] },
        title: { equals: params.title, mode: "insensitive" },
        ...(params.ignoreDeliveryId ? { id: { not: params.ignoreDeliveryId } } : {}),
      },
      select: { id: true, title: true },
      take: 5,
    }),
    prisma.adCreative.findMany({
      where: { projeto: { equals: params.title, mode: "insensitive" } },
      select: { id: true, projeto: true },
      take: 5,
    }),
  ]);

  const hasConflictInDeliveries = deliveries.some((item) => normalizeValidationName(item.title) === normalized);
  const hasConflictInCreatives = creatives.some((item) => normalizeValidationName(item.projeto) === normalized);
  if (hasConflictInDeliveries || hasConflictInCreatives) {
    throw new Error("Ja existe validacao com esta nomenclatura.");
  }
}

async function assertEditorsAreActive(editorIds: string[]) {
  const uniqueEditorIds = Array.from(new Set(editorIds));
  if (uniqueEditorIds.length === 0) return;

  const activeCount = await prisma.editor.count({
    where: {
      id: { in: uniqueEditorIds },
      isActive: true,
    },
  });

  if (activeCount !== uniqueEditorIds.length) {
    throw new Error("Um ou mais editores inativos foram informados");
  }
}

async function computeBonusAndStatus(input: DeliveryInputForCalc) {
  const base = input.baseValue;

  if (input.type === DeliveryType.Upsell) {
    return {
      status: DeliveryStatus.Fixo,
      kpiTotal: null,
      tierLabel: "Fixo",
      bonusCalculated: base,
    };
  }

  if (!hasKpiValues(input)) {
    return {
      status: DeliveryStatus.Pendente,
      kpiTotal: null,
      tierLabel: "Fallback",
      bonusCalculated: base,
    };
  }

  const total = (input.retrabalho ?? 0) + (input.qualidade ?? 0) + (input.prazo ?? 0);
  const tier = getTier(total);

  return {
    status: tier.pct === 0 ? DeliveryStatus.Fallback : DeliveryStatus.Avaliado,
    kpiTotal: total,
    tierLabel: tier.label,
    bonusCalculated: Math.round(base * tier.pct),
  };
}

function toMonthRange(month: string) {
  const [year, mm] = month.split("-").map(Number);
  const start = new Date(Date.UTC(year, mm - 1, 1));
  const end = new Date(Date.UTC(year, mm, 1));
  return { start, end };
}

function mapDelivery(item: DeliveryWithEditors | (Prisma.DeliveryGetPayload<{}> & { editors?: Array<{ editorId: string }> })) {
  const editors = item.editors ?? [];
  const editorBonuses = splitCents(item.bonusCalculated, editors.length).map((bonusCents, idx) => ({
    editorId: editors[idx]?.editorId,
    bonusCents,
  }));
  return {
    id: item.id,
    title: item.title,
    taskId: item.taskId,
    type: item.type,
    date: item.date.toISOString().slice(0, 10),
    status: item.status,
    retrabalho: item.retrabalho,
    qualidade: item.qualidade,
    prazo: item.prazo,
    kpiTotal: item.kpiTotal,
    tierLabel: item.tierLabel,
    baseValueSnapshot: item.baseValueSnapshot,
    isManualValue: item.isManualValue,
    bonus: item.bonusCalculated,
    editorBonuses: editorBonuses.filter((item) => Boolean(item.editorId)) as Array<{ editorId: string; bonusCents: number }>,
    investmentUsd: item.investmentUsd,
    roas: item.roas,
    editorIds: editors.map((de: { editorId: string }) => de.editorId),
  };
}

export async function listDeliveries(query: ListDeliveriesQuery) {
  const where: Prisma.DeliveryWhereInput = {};

  if (query.type) where.type = query.type;
  if (query.status) where.status = query.status;
  if (query.editorId) where.editors = { some: { editorId: query.editorId } };
  if (query.search) where.taskId = { contains: query.search, mode: "insensitive" };
  if (query.month) {
    const { start, end } = toMonthRange(query.month);
    where.date = { gte: start, lt: end };
  }
  // A tela de Validações sempre pede registros originados dela.
  if (query.isValidation !== undefined) {
    where.isValidation = true;
  }

  const data = await prisma.delivery.findMany({
    where,
    orderBy: { date: "desc" },
    include: { editors: true },
  });

  return data.map(mapDelivery);
}

export async function createDelivery(input: CreateDeliveryInput) {
  await assertMonthIsOpen(input.date);
  await assertEditorsAreActive(input.editorIds);
  if (isValidationDeliveryType(input.type)) {
    await assertValidationNameIsUniqueForDelivery({ title: input.title });
  }
  const baseValueSnapshot = await getBaseRate(input.type);
  const computed = await computeBonusAndStatus({
    type: input.type,
    baseValue: baseValueSnapshot,
    retrabalho: input.retrabalho,
    qualidade: input.qualidade,
    prazo: input.prazo,
  });
  const isManualValue = typeof input.bonusManual === "number";
  const finalBonus = isManualValue ? (input.bonusManual ?? computed.bonusCalculated) : computed.bonusCalculated;

  const created = await prisma.delivery.create({
    data: {
      title: input.title,
      taskId: input.taskId,
      type: input.type,
      date: new Date(input.date),
      retrabalho: input.retrabalho,
      qualidade: input.qualidade,
      prazo: input.prazo,
      baseValueSnapshot,
      isManualValue,
      isValidation: input.isValidation ?? false,
      kpiTotal: computed.kpiTotal,
      tierLabel: computed.tierLabel,
      bonusCalculated: finalBonus,
      investmentUsd: input.investmentUsd,
      roas: input.roas,
      status: computed.status,
      editors: {
        createMany: {
          data: input.editorIds.map((editorId) => ({ editorId })),
        },
      },
    },
    include: { editors: true },
  });

  return mapDelivery(created);
}

export async function updateDelivery(id: string, input: UpdateDeliveryInput) {
  const existing = await prisma.delivery.findUniqueOrThrow({
    where: { id },
  });
  await assertMonthIsOpen(existing.date);
  if (input.date) {
    await assertMonthIsOpen(input.date);
  }
  const nextTitle = input.title ?? existing.title;
  const nextType = input.type ?? existing.type;

  if (isValidationDeliveryType(nextType)) {
    await assertValidationNameIsUniqueForDelivery({ title: nextTitle, ignoreDeliveryId: id });
  }

  const nextRetrabalho = input.retrabalho ?? existing.retrabalho ?? undefined;
  const nextQualidade = input.qualidade ?? existing.qualidade ?? undefined;
  const nextPrazo = input.prazo ?? existing.prazo ?? undefined;

  const kpiChanged =
    input.type !== undefined ||
    input.retrabalho !== undefined ||
    input.qualidade !== undefined ||
    input.prazo !== undefined;
  const typeChanged = input.type !== undefined && input.type !== existing.type;

  const nextBaseValueSnapshot = typeChanged
    ? await getBaseRate(nextType)
    : existing.baseValueSnapshot;

  const computed = await computeBonusAndStatus({
    type: nextType,
    baseValue: nextBaseValueSnapshot,
    retrabalho: nextRetrabalho,
    qualidade: nextQualidade,
    prazo: nextPrazo,
  });

  if (input.editorIds) {
    await assertEditorsAreActive(input.editorIds);
  }

  const updated = await prisma.$transaction(async (tx) => {
    if (input.editorIds) {
      await tx.deliveryEditor.deleteMany({ where: { deliveryId: id } });
      await tx.deliveryEditor.createMany({
        data: input.editorIds.map((editorId) => ({ deliveryId: id, editorId })),
      });
    }

    return tx.delivery.update({
      where: { id },
      data: {
        taskId: input.taskId ?? existing.taskId,
        title: input.title ?? existing.title,
        type: nextType,
        date: input.date ? new Date(input.date) : existing.date,
        retrabalho: nextRetrabalho,
        qualidade: nextQualidade,
        prazo: nextPrazo,
        baseValueSnapshot: nextBaseValueSnapshot,
        status: input.status ?? (kpiChanged && !existing.isManualValue ? computed.status : existing.status),
        kpiTotal: kpiChanged && !existing.isManualValue ? computed.kpiTotal : existing.kpiTotal,
        tierLabel: kpiChanged && !existing.isManualValue ? computed.tierLabel : existing.tierLabel,
        isManualValue: typeof input.bonusManual === "number" ? true : existing.isManualValue,
        bonusCalculated:
          typeof input.bonusManual === "number"
            ? input.bonusManual
            : kpiChanged && !existing.isManualValue
              ? computed.bonusCalculated
              : existing.bonusCalculated,
        investmentUsd: input.investmentUsd ?? existing.investmentUsd,
        roas: input.roas ?? existing.roas,
      },
      include: { editors: true },
    });
  });

  return mapDelivery(updated);
}

export async function deleteDelivery(id: string) {
  const existing = await prisma.delivery.findUniqueOrThrow({
    where: { id },
    select: { date: true },
  });
  await assertMonthIsOpen(existing.date);
  await prisma.delivery.delete({ where: { id } });
}

export async function getSummary(month?: string) {
  const where: Prisma.DeliveryWhereInput = {};
  if (month) {
    const { start, end } = toMonthRange(month);
    where.date = { gte: start, lt: end };
  }

  const all = await prisma.delivery.findMany({ where });
  const byType = (type: DeliveryType) => all.filter((d) => d.type === type).length;

  return {
    total: all.length,
    vsl: byType(DeliveryType.VSL),
    leadMl: byType(DeliveryType.Lead) + byType(DeliveryType.ML),
    troca: byType(DeliveryType.Troca),
    upsell: byType(DeliveryType.Upsell),
    pending: all.filter((d) => d.status === DeliveryStatus.Pendente).length,
  };
}
