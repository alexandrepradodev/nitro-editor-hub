import { prisma } from "../../lib/prisma";
import { AdCreativeMediaType } from "@prisma/client";
import type { CreateAdCreativeInput, ListAdCreativesQuery, UpdateAdCreativeInput } from "./ad-creatives.schema";
import { assertMonthIsOpen } from "../closing/closing-lock";

function toMonthRange(month: string) {
  const [year, mm] = month.split("-").map(Number);
  // Usar UTC para evitar off-by-one em fusos ao criar filtros de data.
  const start = new Date(Date.UTC(year, mm - 1, 1));
  const end = new Date(Date.UTC(year, mm, 1));
  return { start, end };
}

function mapAdCreative(item: {
  id: string;
  editorId: string;
  projeto: string;
  leva: string;
  plataforma: string;
  mediaType: AdCreativeMediaType;
  quantidade: number;
  unitValueSnapshot: number;
  lineTotalValue: number;
  isManualValue: boolean;
  taskCode: string | null;
  date: Date;
  observacoes: string | null;
  investmentUsd: number | null;
  roas: number | null;
  editor: { name: string; initials: string; colorClass: string };
}) {
  return {
    id: item.id,
    editorId: item.editorId,
    projeto: item.projeto,
    leva: item.leva,
    plataforma: item.plataforma,
    mediaType: item.mediaType,
    quantidade: item.quantidade,
    unitValueSnapshot: item.unitValueSnapshot,
    lineTotalValue: item.lineTotalValue,
    isManualValue: item.isManualValue,
    taskCode: item.taskCode,
    date: item.date.toISOString().slice(0, 10),
    observacoes: item.observacoes,
    investmentUsd: item.investmentUsd,
    roas: item.roas,
    editor: item.editor,
  };
}

async function assertEditorIsActive(editorId: string) {
  const activeEditor = await prisma.editor.findFirst({
    where: { id: editorId, isActive: true },
    select: { id: true },
  });

  if (!activeEditor) {
    throw new Error("Editor inativo nao pode receber atribuicoes");
  }
}

async function getCreativeUnitRate(mediaType: AdCreativeMediaType): Promise<number> {
  const rate = await prisma.adCreativeRate.findUnique({ where: { mediaType } });
  if (rate) return rate.baseValue;
  return 300;
}

export async function listAdCreatives(query: ListAdCreativesQuery) {
  const where: Record<string, unknown> = {};
  if (query.month) {
    const { start, end } = toMonthRange(query.month);
    where.date = { gte: start, lt: end };
  }
  // A tela de Validações sempre pede registros originados dela.
  if (query.isValidation !== undefined) {
    where.isValidation = true;
  }

  const data = await prisma.adCreative.findMany({
    where: where as never,
    include: {
      editor: {
        select: { name: true, initials: true, colorClass: true },
      },
    },
    orderBy: { date: "desc" },
  });

  return data.map(mapAdCreative);
}

export async function createAdCreative(input: CreateAdCreativeInput) {
  await assertMonthIsOpen(input.date);
  await assertEditorIsActive(input.editorId);
  const unitValueSnapshot = await getCreativeUnitRate(input.mediaType);
  const isManualValue = typeof input.lineTotalValue === "number";
  const lineTotalValue = isManualValue ? input.lineTotalValue ?? 0 : unitValueSnapshot * input.quantidade;
  const effectiveUnitValue = input.quantidade > 0 ? Math.round(lineTotalValue / input.quantidade) : unitValueSnapshot;
  // taskCode pode ser opcional, mas a tabela ainda espera string ou null.
  const created = await prisma.adCreative.create({
    data: {
      editorId: input.editorId,
      projeto: input.projeto,
      leva: input.leva,
      plataforma: input.plataforma,
      mediaType: input.mediaType,
      quantidade: input.quantidade,
      unitValueSnapshot: effectiveUnitValue,
      lineTotalValue,
      isManualValue,
      isValidation: input.isValidation ?? false,
      taskCode: input.taskCode ?? null,
      date: new Date(input.date),
      observacoes: input.observacoes ?? null,
      investmentUsd: input.investmentUsd ?? null,
      roas: input.roas ?? null,
    },
    include: {
      editor: {
        select: { name: true, initials: true, colorClass: true },
      },
    },
  });

  return mapAdCreative({
    id: created.id,
    editorId: created.editorId,
    projeto: created.projeto,
    leva: created.leva,
    plataforma: created.plataforma,
    mediaType: created.mediaType,
    quantidade: created.quantidade,
    unitValueSnapshot: created.unitValueSnapshot,
    lineTotalValue: created.lineTotalValue,
    isManualValue: created.isManualValue,
    taskCode: created.taskCode,
    date: created.date,
    observacoes: created.observacoes,
    investmentUsd: created.investmentUsd,
    roas: created.roas,
    editor: created.editor,
  });
}

export async function deleteAdCreative(id: string) {
  const existing = await prisma.adCreative.findUniqueOrThrow({
    where: { id },
    select: { date: true },
  });
  await assertMonthIsOpen(existing.date);
  await prisma.adCreative.delete({ where: { id } });
}

export async function updateAdCreative(id: string, input: UpdateAdCreativeInput) {
  if (input.editorId) {
    await assertEditorIsActive(input.editorId);
  }

  const existing = await prisma.adCreative.findUniqueOrThrow({ where: { id } });
  await assertMonthIsOpen(existing.date);
  if (input.date) {
    await assertMonthIsOpen(input.date);
  }
  const nextMediaType = input.mediaType ?? existing.mediaType;
  const nextQuantidade = input.quantidade ?? existing.quantidade;
  const mediaTypeChanged = input.mediaType !== undefined && input.mediaType !== existing.mediaType;
  const quantityChanged = input.quantidade !== undefined && input.quantidade !== existing.quantidade;
  const hasManualLineTotal = typeof input.lineTotalValue === "number";

  let nextUnitValueSnapshot = existing.unitValueSnapshot;
  let nextLineTotalValue = existing.lineTotalValue;
  let nextIsManualValue = existing.isManualValue;

  if (hasManualLineTotal) {
    const manualLineTotal = input.lineTotalValue ?? 0;
    nextLineTotalValue = manualLineTotal;
    nextUnitValueSnapshot = nextQuantidade > 0 ? Math.round(manualLineTotal / nextQuantidade) : existing.unitValueSnapshot;
    nextIsManualValue = true;
  } else if (!existing.isManualValue && (mediaTypeChanged || quantityChanged)) {
    nextUnitValueSnapshot = mediaTypeChanged
      ? await getCreativeUnitRate(nextMediaType)
      : existing.unitValueSnapshot;
    nextLineTotalValue = nextUnitValueSnapshot * nextQuantidade;
    nextIsManualValue = false;
  }

  const updated = await prisma.adCreative.update({
    where: { id },
    data: {
      editorId: input.editorId ?? undefined,
      projeto: input.projeto ?? undefined,
      leva: input.leva ?? undefined,
      plataforma: input.plataforma ?? undefined,
      mediaType: input.mediaType ?? undefined,
      quantidade: input.quantidade ?? undefined,
      unitValueSnapshot: nextUnitValueSnapshot,
      lineTotalValue: nextLineTotalValue,
      isManualValue: nextIsManualValue,
      taskCode: input.taskCode ?? undefined,
      date: input.date ? new Date(input.date) : undefined,
      observacoes: input.observacoes ?? undefined,
      investmentUsd: input.investmentUsd ?? undefined,
      roas: input.roas ?? undefined,
    },
    include: {
      editor: {
        select: { name: true, initials: true, colorClass: true },
      },
    },
  });

  return mapAdCreative(updated);
}

export async function getAccumulatedByEditor(query: ListAdCreativesQuery) {
  const where: Record<string, unknown> = {};
  if (query.month) {
    const { start, end } = toMonthRange(query.month);
    where.date = { gte: start, lt: end };
  }

  const data = await prisma.adCreative.findMany({
    where: where as never,
    include: {
      editor: {
        select: { name: true, initials: true, colorClass: true },
      },
    },
  });

  const acc = new Map<
    string,
    {
      editorId: string;
      editorName: string;
      editorInitials: string;
      editorColorClass: string;
      totalAdsVideo: number;
      totalAdsImage: number;
      accumulatedValueVideo: number;
      accumulatedValueImage: number;
    }
  >();

  for (const item of data) {
    const existing = acc.get(item.editorId);
    const totalAdsVideo = existing?.totalAdsVideo ?? 0;
    const totalAdsImage = existing?.totalAdsImage ?? 0;
    const accumulatedValueVideo = existing?.accumulatedValueVideo ?? 0;
    const accumulatedValueImage = existing?.accumulatedValueImage ?? 0;

    if (item.mediaType === AdCreativeMediaType.Video) {
      acc.set(item.editorId, {
        editorId: item.editorId,
        editorName: item.editor.name,
        editorInitials: item.editor.initials,
        editorColorClass: item.editor.colorClass,
        totalAdsVideo: totalAdsVideo + item.quantidade,
        totalAdsImage,
        accumulatedValueVideo: accumulatedValueVideo + item.lineTotalValue,
        accumulatedValueImage,
      });
    } else {
      acc.set(item.editorId, {
        editorId: item.editorId,
        editorName: item.editor.name,
        editorInitials: item.editor.initials,
        editorColorClass: item.editor.colorClass,
        totalAdsVideo,
        totalAdsImage: totalAdsImage + item.quantidade,
        accumulatedValueVideo,
        accumulatedValueImage: accumulatedValueImage + item.lineTotalValue,
      });
    }
  }

  return Array.from(acc.values())
    .sort(
      (a, b) =>
        b.accumulatedValueVideo + b.accumulatedValueImage - (a.accumulatedValueVideo + a.accumulatedValueImage)
    );
}

export async function listAdCreativeRates() {
  const [videoRate, imageRate] = await Promise.all([
    prisma.adCreativeRate.findUnique({ where: { mediaType: AdCreativeMediaType.Video } }),
    prisma.adCreativeRate.findUnique({ where: { mediaType: AdCreativeMediaType.Image } }),
  ]);

  const VIDEO_DEFAULT_CENTS = 300;
  const IMAGE_DEFAULT_CENTS = 300;

  return {
    video: videoRate?.baseValue ?? VIDEO_DEFAULT_CENTS,
    image: imageRate?.baseValue ?? IMAGE_DEFAULT_CENTS,
  };
}

export async function upsertAdCreativeRate(input: { mediaType: AdCreativeMediaType; baseValue: number }) {
  return prisma.adCreativeRate.upsert({
    where: { mediaType: input.mediaType },
    update: { baseValue: input.baseValue },
    create: { mediaType: input.mediaType, baseValue: input.baseValue },
  });
}