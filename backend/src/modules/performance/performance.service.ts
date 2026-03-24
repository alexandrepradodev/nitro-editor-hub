import { DeliveryType } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import type { PerformanceSummaryQuery } from "./performance.schema";

function parseDateInput(dateInput?: string, fallback?: Date) {
  if (!dateInput) return fallback;
  const [year, month, day] = dateInput.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function resolveDateRange(query: PerformanceSummaryQuery) {
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const from = parseDateInput(query.from, monthStart) ?? monthStart;
  const to = parseDateInput(query.to, now) ?? now;
  const toInclusive = new Date(to);
  toInclusive.setUTCDate(toInclusive.getUTCDate() + 1);
  return { from, to: toInclusive };
}

function monthKey(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function splitCents(totalCents: number, count: number) {
  if (count <= 0) return [];
  const base = Math.floor(totalCents / count);
  const remainder = totalCents - base * count;
  return Array.from({ length: count }, (_, idx) => (idx === count - 1 ? base + remainder : base));
}

export async function getPerformanceSummary(query: PerformanceSummaryQuery) {
  const { from, to } = resolveDateRange(query);
  const editorIds = query.editorIds
    ? query.editorIds.split(",").map((item) => item.trim()).filter(Boolean)
    : [];
  const types = query.types
    ? query.types.split(",").map((item) => item.trim()).filter(Boolean)
    : [];

  const [editors, deliveries, adCreatives, qualityBatches] = await Promise.all([
    prisma.editor.findMany({
      where: editorIds.length ? { id: { in: editorIds } } : undefined,
      select: { id: true, name: true, initials: true, colorClass: true, salaryFixed: true },
      orderBy: { name: "asc" },
    }),
    prisma.delivery.findMany({
      where: {
        date: { gte: from, lt: to },
        ...(editorIds.length ? { editors: { some: { editorId: { in: editorIds } } } } : {}),
      },
      select: {
        id: true,
        type: true,
        date: true,
        status: true,
        bonusCalculated: true,
        retrabalho: true,
        qualidade: true,
        prazo: true,
        editors: { select: { editorId: true } },
      },
    }),
    prisma.adCreative.findMany({
      where: {
        date: { gte: from, lt: to },
        ...(editorIds.length ? { editorId: { in: editorIds } } : {}),
      },
      select: {
        id: true,
        editorId: true,
        date: true,
        quantidade: true,
        lineTotalValue: true,
      },
    }),
    prisma.qualityBatch.findMany({
      where: {
        date: { gte: from, lt: to },
        ...(editorIds.length ? { editorId: { in: editorIds } } : {}),
      },
      select: {
        id: true,
        date: true,
        editorId: true,
        accuracyPercent: true,
        bonusCents: true,
      },
    }),
  ]);

  const filteredDeliveries = deliveries.filter((item) => {
    if (!types.length) return true;
    return types.includes(item.type);
  });
  const filteredAds = adCreatives.filter(() => !types.length || types.includes("Criativos"));

  const deliveryTypeCount = {
    VSL: filteredDeliveries.filter((item) => item.type === DeliveryType.VSL).length,
    Lead: filteredDeliveries.filter((item) => item.type === DeliveryType.Lead).length,
    ML: filteredDeliveries.filter((item) => item.type === DeliveryType.ML).length,
    Troca: filteredDeliveries.filter((item) => item.type === DeliveryType.Troca).length,
    Upsell: filteredDeliveries.filter((item) => item.type === DeliveryType.Upsell).length,
  };
  const validationsCount = filteredDeliveries.filter(
    (item) => item.type === DeliveryType.VSL || item.type === DeliveryType.Troca || item.type === DeliveryType.Lead,
  ).length + filteredAds.length;

  const deliveryBonusByEditor = new Map<string, number>();
  for (const row of filteredDeliveries) {
    const ids = row.editors.map((item) => item.editorId);
    const split = splitCents(row.bonusCalculated, ids.length);
    ids.forEach((id, idx) => {
      deliveryBonusByEditor.set(id, (deliveryBonusByEditor.get(id) ?? 0) + (split[idx] ?? 0));
    });
  }
  const adBonusByEditor = new Map<string, number>();
  filteredAds.forEach((row) => adBonusByEditor.set(row.editorId, (adBonusByEditor.get(row.editorId) ?? 0) + row.lineTotalValue));
  const qualityBonusByEditor = new Map<string, number>();
  qualityBatches.forEach((row) =>
    qualityBonusByEditor.set(row.editorId, (qualityBonusByEditor.get(row.editorId) ?? 0) + row.bonusCents),
  );

  const monthSet = new Set<string>();
  [...filteredDeliveries, ...filteredAds, ...qualityBatches].forEach((row) => monthSet.add(monthKey(row.date)));
  const months = Array.from(monthSet).sort();

  const monthlyCost = months.map((m) => {
    const monthDelivery = filteredDeliveries.filter((row) => monthKey(row.date) === m).reduce((acc, row) => acc + row.bonusCalculated, 0);
    const monthAds = filteredAds.filter((row) => monthKey(row.date) === m).reduce((acc, row) => acc + row.lineTotalValue, 0);
    const monthQuality = qualityBatches.filter((row) => monthKey(row.date) === m).reduce((acc, row) => acc + row.bonusCents, 0);
    const salary = editors.reduce((acc, editor) => acc + ((editor.salaryFixed ?? 0) * 100), 0);
    return { month: m, totalCents: salary + monthDelivery + monthAds + monthQuality };
  });

  const adsByEditorSeries = editors.map((editor) => ({
    editorId: editor.id,
    editorName: editor.name,
    initials: editor.initials,
    colorClass: editor.colorClass,
    data: months.map((m) =>
      filteredAds
        .filter((row) => row.editorId === editor.id && monthKey(row.date) === m)
        .reduce((acc, row) => acc + row.quantidade, 0),
    ),
  }));

  const qualityByEditorSeries = editors.map((editor) => ({
    editorId: editor.id,
    editorName: editor.name,
    initials: editor.initials,
    colorClass: editor.colorClass,
    data: months.map((m) => {
      const rows = qualityBatches.filter((row) => row.editorId === editor.id && monthKey(row.date) === m);
      if (!rows.length) return 0;
      return Number((rows.reduce((acc, row) => acc + row.accuracyPercent, 0) / rows.length).toFixed(1));
    }),
  }));

  const totalProduced = filteredDeliveries.length + filteredAds.reduce((acc, row) => acc + row.quantidade, 0) + validationsCount;
  const totalAds = filteredAds.reduce((acc, row) => acc + row.quantidade, 0);
  const avgQuality = qualityBatches.length
    ? Number((qualityBatches.reduce((acc, row) => acc + row.accuracyPercent, 0) / qualityBatches.length).toFixed(1))
    : 0;
  const costBreakdown = {
    salariesCents: editors.reduce((acc, editor) => acc + ((editor.salaryFixed ?? 0) * 100), 0),
    deliveryBonusCents: Array.from(deliveryBonusByEditor.values()).reduce((acc, value) => acc + value, 0),
    adBonusCents: Array.from(adBonusByEditor.values()).reduce((acc, value) => acc + value, 0),
    qualityBonusCents: Array.from(qualityBonusByEditor.values()).reduce((acc, value) => acc + value, 0),
  };
  const totalCost = costBreakdown.salariesCents + costBreakdown.deliveryBonusCents + costBreakdown.adBonusCents + costBreakdown.qualityBonusCents;

  const rankingValidations = editors
    .map((editor) => ({
      editorId: editor.id,
      name: editor.name,
      initials: editor.initials,
      colorClass: editor.colorClass,
      valueCents: (deliveryBonusByEditor.get(editor.id) ?? 0) + (adBonusByEditor.get(editor.id) ?? 0),
    }))
    .sort((a, b) => b.valueCents - a.valueCents);

  const rankingQuality = editors
    .map((editor) => {
      const rows = qualityBatches.filter((row) => row.editorId === editor.id);
      const avg = rows.length ? rows.reduce((acc, row) => acc + row.accuracyPercent, 0) / rows.length : 0;
      return {
        editorId: editor.id,
        name: editor.name,
        initials: editor.initials,
        colorClass: editor.colorClass,
        avgQualityPercent: Number(avg.toFixed(1)),
      };
    })
    .sort((a, b) => b.avgQualityPercent - a.avgQualityPercent);

  const noteBuckets = { n100: 0, n80: 0, n60: 0, n40: 0, n0: 0 };
  qualityBatches.forEach((row) => {
    if (row.accuracyPercent >= 100) noteBuckets.n100 += 1;
    else if (row.accuracyPercent >= 80) noteBuckets.n80 += 1;
    else if (row.accuracyPercent >= 60) noteBuckets.n60 += 1;
    else if (row.accuracyPercent >= 40) noteBuckets.n40 += 1;
    else noteBuckets.n0 += 1;
  });

  return {
    filters: {
      from: from.toISOString().slice(0, 10),
      to: new Date(to.getTime() - 1).toISOString().slice(0, 10),
      editorIds,
      types,
    },
    kpis: {
      totalProduced,
      totalDeliveries: filteredDeliveries.length,
      totalAds,
      totalValidations: validationsCount,
      avgQualityPercent: avgQuality,
      sectorCostCents: totalCost,
      byDeliveryType: deliveryTypeCount,
    },
    charts: {
      months,
      monthlyCost,
      volumeByType: {
        Criativos: totalAds,
        VSL: deliveryTypeCount.VSL,
        Lead: deliveryTypeCount.Lead,
        ML: deliveryTypeCount.ML,
        Troca: deliveryTypeCount.Troca,
        Upsell: deliveryTypeCount.Upsell,
      },
      adsByEditorSeries,
      qualityByEditorSeries,
      noteDistribution: noteBuckets,
      costBreakdown,
    },
    rankings: {
      validations: rankingValidations,
      quality: rankingQuality,
    },
  };
}

