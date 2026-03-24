import { ClosingPeriodStatus, DeliveryStatus, DeliveryType } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { mapEditorBonuses } from "../../lib/split-bonus";
import type { ClosingSummaryQuery } from "./closing.schema";

function resolveMonth(month?: string) {
  if (month) return month;
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function toMonthRange(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  const start = new Date(Date.UTC(year, monthNumber - 1, 1));
  const end = new Date(Date.UTC(year, monthNumber, 1));
  return { start, end };
}

type EditorClosing = {
  editorId: string;
  name: string;
  initials: string;
  role: string;
  colorClass: string;
  productionType: string | null;
  salaryCents: number;
  deliveryBonusCents: number;
  adBonusCents: number;
  qualityBonusCents: number;
  subtotalCents: number;
  netTotalCents: number;
};

type ClosingSummaryResponse = {
  month: string;
  periodStatus: "open" | "closed";
  pendingAlert: { pendingDeliveries: number; message: string };
  totals: {
    totalSalaryCents: number;
    totalBonusCents: number;
    totalNetCents: number;
  };
  checklist: {
    deliveriesCount: number;
    vslLeadMlUpsellCount: number;
    adCreativesCount: number;
    qualityBatchesCount: number;
  };
  editors: EditorClosing[];
};

async function buildOpenClosingSummary(month: string): Promise<ClosingSummaryResponse> {
  const { start, end } = toMonthRange(month);

  const [editors, deliveries, adCreatives, qualityRows] = await Promise.all([
    prisma.editor.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        initials: true,
        role: true,
        colorClass: true,
        productionType: true,
        salaryFixed: true,
      },
    }),
    prisma.delivery.findMany({
      where: { date: { gte: start, lt: end } },
      select: {
        id: true,
        type: true,
        bonusCalculated: true,
        status: true,
        editors: { select: { editorId: true } },
      },
    }),
    prisma.adCreative.findMany({
      where: { date: { gte: start, lt: end } },
      select: { editorId: true, lineTotalValue: true },
    }),
    prisma.qualityBatch.groupBy({
      by: ["editorId"],
      where: { date: { gte: start, lt: end } },
      _sum: { bonusCents: true, totalLevas: true },
    }),
  ]);

  const qualityByEditor = new Map(
    qualityRows.map((row) => [row.editorId, { bonusCents: row._sum.bonusCents ?? 0, totalLevas: row._sum.totalLevas ?? 0 }]),
  );

  const deliveryBonusByEditor = new Map<string, number>();
  for (const delivery of deliveries) {
    const editorIds = delivery.editors.map((item) => item.editorId);
    const editorBonuses = mapEditorBonuses(editorIds, delivery.bonusCalculated);
    editorBonuses.forEach((item) => {
      if (!item.editorId) return;
      deliveryBonusByEditor.set(item.editorId, (deliveryBonusByEditor.get(item.editorId) ?? 0) + item.bonusCents);
    });
  }

  const adBonusByEditor = new Map<string, number>();
  for (const ad of adCreatives) {
    adBonusByEditor.set(ad.editorId, (adBonusByEditor.get(ad.editorId) ?? 0) + ad.lineTotalValue);
  }

  const editorRows: EditorClosing[] = editors.map((editor) => {
    const salaryCents = (editor.salaryFixed ?? 0) * 100;
    const deliveryBonusCents = deliveryBonusByEditor.get(editor.id) ?? 0;
    const adBonusCents = adBonusByEditor.get(editor.id) ?? 0;
    const qualityBonusCents = qualityByEditor.get(editor.id)?.bonusCents ?? 0;
    const subtotalCents = salaryCents + deliveryBonusCents + adBonusCents + qualityBonusCents;
    const netTotalCents = subtotalCents;

    return {
      editorId: editor.id,
      name: editor.name,
      initials: editor.initials,
      role: editor.role,
      colorClass: editor.colorClass,
      productionType: editor.productionType,
      salaryCents,
      deliveryBonusCents,
      adBonusCents,
      qualityBonusCents,
      subtotalCents,
      netTotalCents,
    };
  });

  const totalSalaryCents = editorRows.reduce((acc, row) => acc + row.salaryCents, 0);
  const totalBonusCents = editorRows.reduce(
    (acc, row) => acc + row.deliveryBonusCents + row.adBonusCents + row.qualityBonusCents,
    0,
  );
  const totalNetCents = editorRows.reduce((acc, row) => acc + row.netTotalCents, 0);

  const pendingDeliveries = deliveries.filter((item) => item.status === DeliveryStatus.Pendente).length;
  const vslLeadMlUpsellCount = deliveries.filter(
    (item) =>
      item.type === DeliveryType.VSL ||
      item.type === DeliveryType.Lead ||
      item.type === DeliveryType.ML ||
      item.type === DeliveryType.Upsell,
  ).length;

  return {
    month,
    periodStatus: "open",
    pendingAlert: {
      pendingDeliveries,
      message:
        pendingDeliveries > 0
          ? `${pendingDeliveries} entregas pendentes de KPI no período`
          : "Sem pendências de KPI no período",
    },
    totals: {
      totalSalaryCents,
      totalBonusCents,
      totalNetCents,
    },
    checklist: {
      deliveriesCount: deliveries.length,
      vslLeadMlUpsellCount,
      adCreativesCount: adCreatives.length,
      qualityBatchesCount: qualityRows.reduce((acc, row) => acc + (row._sum.totalLevas ? 1 : 0), 0),
    },
    editors: editorRows,
  };
}

function mapClosedPeriodToSummary(period: {
  monthKey: string;
  pendingDeliveries: number;
  pendingAlertMessage: string;
  totalSalaryCents: number;
  totalBonusCents: number;
  totalNetCents: number;
  deliveriesCount: number;
  vslLeadMlUpsellCount: number;
  adCreativesCount: number;
  qualityBatchesCount: number;
  editorSnapshots: Array<{
    editorId: string;
    name: string;
    initials: string;
    role: string;
    colorClass: string;
    productionType: string | null;
    salaryCents: number;
    deliveryBonusCents: number;
    adBonusCents: number;
    qualityBonusCents: number;
    subtotalCents: number;
    netTotalCents: number;
  }>;
}): ClosingSummaryResponse {
  return {
    month: period.monthKey,
    periodStatus: "closed",
    pendingAlert: {
      pendingDeliveries: period.pendingDeliveries,
      message: period.pendingAlertMessage,
    },
    totals: {
      totalSalaryCents: period.totalSalaryCents,
      totalBonusCents: period.totalBonusCents,
      totalNetCents: period.totalNetCents,
    },
    checklist: {
      deliveriesCount: period.deliveriesCount,
      vslLeadMlUpsellCount: period.vslLeadMlUpsellCount,
      adCreativesCount: period.adCreativesCount,
      qualityBatchesCount: period.qualityBatchesCount,
    },
    editors: period.editorSnapshots.map((row) => ({
      editorId: row.editorId,
      name: row.name,
      initials: row.initials,
      role: row.role,
      colorClass: row.colorClass,
      productionType: row.productionType,
      salaryCents: row.salaryCents,
      deliveryBonusCents: row.deliveryBonusCents,
      adBonusCents: row.adBonusCents,
      qualityBonusCents: row.qualityBonusCents,
      subtotalCents: row.subtotalCents,
      netTotalCents: row.netTotalCents,
    })),
  };
}

export async function getClosingSummary(query: ClosingSummaryQuery) {
  const month = resolveMonth(query.month);
  const period = await prisma.closingPeriod.findUnique({
    where: { monthKey: month },
    include: {
      editorSnapshots: { orderBy: { name: "asc" } },
    },
  });
  if (period) return mapClosedPeriodToSummary(period);
  return buildOpenClosingSummary(month);
}

export async function closePeriod(month: string, closedByUserId: string) {
  const existing = await prisma.closingPeriod.findUnique({
    where: { monthKey: month },
    select: { id: true },
  });
  if (existing) {
    throw new Error(`Periodo ${month} ja foi fechado e nao pode ser alterado.`);
  }

  const summary = await buildOpenClosingSummary(month);

  const created = await prisma.$transaction(async (tx) => {
    const period = await tx.closingPeriod.create({
      data: {
        monthKey: month,
        status: ClosingPeriodStatus.Closed,
        closedAt: new Date(),
        closedByUserId,
        pendingDeliveries: summary.pendingAlert.pendingDeliveries,
        pendingAlertMessage: summary.pendingAlert.message,
        totalSalaryCents: summary.totals.totalSalaryCents,
        totalBonusCents: summary.totals.totalBonusCents,
        totalNetCents: summary.totals.totalNetCents,
        deliveriesCount: summary.checklist.deliveriesCount,
        vslLeadMlUpsellCount: summary.checklist.vslLeadMlUpsellCount,
        adCreativesCount: summary.checklist.adCreativesCount,
        qualityBatchesCount: summary.checklist.qualityBatchesCount,
      },
    });

    if (summary.editors.length > 0) {
      await tx.closingEditorSnapshot.createMany({
        data: summary.editors.map((row) => ({
          closingPeriodId: period.id,
          editorId: row.editorId,
          name: row.name,
          initials: row.initials,
          role: row.role,
          colorClass: row.colorClass,
          productionType: row.productionType,
          salaryCents: row.salaryCents,
          deliveryBonusCents: row.deliveryBonusCents,
          adBonusCents: row.adBonusCents,
          qualityBonusCents: row.qualityBonusCents,
          subtotalCents: row.subtotalCents,
          netTotalCents: row.netTotalCents,
        })),
      });
    }

    return tx.closingPeriod.findUniqueOrThrow({
      where: { id: period.id },
      include: { editorSnapshots: { orderBy: { name: "asc" } } },
    });
  });

  return mapClosedPeriodToSummary(created);
}

export async function listClosedPeriods() {
  const periods = await prisma.closingPeriod.findMany({
    orderBy: { monthKey: "desc" },
    select: {
      id: true,
      monthKey: true,
      status: true,
      closedAt: true,
      closedByUserId: true,
      totalSalaryCents: true,
      totalBonusCents: true,
      totalNetCents: true,
    },
  });

  return periods.map((period) => ({
    id: period.id,
    month: period.monthKey,
    status: period.status === ClosingPeriodStatus.Closed ? "closed" : "open",
    closedAt: period.closedAt.toISOString(),
    closedByUserId: period.closedByUserId,
    totals: {
      totalSalaryCents: period.totalSalaryCents,
      totalBonusCents: period.totalBonusCents,
      totalNetCents: period.totalNetCents,
    },
  }));
}

export async function getClosedPeriodByMonth(month: string) {
  const period = await prisma.closingPeriod.findUnique({
    where: { monthKey: month },
    include: {
      editorSnapshots: { orderBy: { name: "asc" } },
    },
  });
  if (!period) {
    return null;
  }
  return mapClosedPeriodToSummary(period);
}
