import ExcelJS from "exceljs";
import { prisma } from "../../lib/prisma";
import { mapEditorBonuses } from "../../lib/split-bonus";
import type { ClosingSummaryQuery } from "./closing.schema";
import { getClosingSummary, toMonthRange } from "./closing.service";

function brlNumber(cents: number): number {
  return Math.round(cents) / 100;
}

export async function exportClosingSpreadsheet(query: ClosingSummaryQuery): Promise<{ buffer: Buffer; monthKey: string }> {
  const summary = await getClosingSummary(query);
  const monthKey = summary.month;
  const { start, end } = toMonthRange(monthKey);

  const deliveries = await prisma.delivery.findMany({
    where: { date: { gte: start, lt: end } },
    include: {
      editors: {
        include: {
          editor: { select: { name: true, initials: true, role: true } },
        },
      },
    },
  });

  type RowVals = (string | number | Date | null)[];
  const entregaRows: RowVals[] = [];

  for (const d of deliveries) {
    const ids = d.editors.map((e) => e.editorId);
    const bonuses = mapEditorBonuses(ids, d.bonusCalculated);
    d.editors.forEach((de, idx) => {
      const b = bonuses[idx];
      if (!b?.editorId) return;
      const gestor = de.editor?.name ?? "";
      entregaRows.push([
        gestor,
        d.date,
        d.type,
        d.title,
        d.taskId ?? "",
        d.status,
        d.tierLabel ?? "",
        d.retrabalho ?? "",
        d.qualidade ?? "",
        d.prazo ?? "",
        d.kpiTotal ?? "",
        brlNumber(d.baseValueSnapshot),
        brlNumber(d.bonusCalculated),
        brlNumber(b.bonusCents),
        d.investmentUsd ?? "",
        d.roas ?? "",
      ]);
    });
  }

  entregaRows.sort((a, b) => {
    const ga = String(a[0] ?? "");
    const gb = String(b[0] ?? "");
    const g = ga.localeCompare(gb, "pt-BR");
    if (g !== 0) return g;
    const da = a[1] instanceof Date ? a[1].getTime() : 0;
    const db = b[1] instanceof Date ? b[1].getTime() : 0;
    return da - db;
  });

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Nitro Hub Editor";

  const moneyFmt = "#,##0.00";

  const resumo = workbook.addWorksheet("Resumo", { views: [{ state: "frozen", ySplit: 1 }] });
  resumo.addRow([
    "Editor",
    "Cargo",
    "Tipo produção",
    "Salário fixo (R$)",
    "Bônus VSL/Lead/ML/Upsell (R$)",
    "Bônus criativos AD (R$)",
    "Bônus qualidade (R$)",
    "Subtotal (R$)",
    "Total líquido (R$)",
  ]);
  resumo.getRow(1).font = { bold: true };

  for (const e of summary.editors) {
    resumo.addRow([
      e.name,
      e.role,
      e.productionType ?? "",
      brlNumber(e.salaryCents),
      brlNumber(e.deliveryBonusCents),
      brlNumber(e.adBonusCents),
      brlNumber(e.qualityBonusCents),
      brlNumber(e.subtotalCents),
      brlNumber(e.netTotalCents),
    ]);
  }

  const sumDel = summary.editors.reduce((a, x) => a + x.deliveryBonusCents, 0);
  const sumAd = summary.editors.reduce((a, x) => a + x.adBonusCents, 0);
  const sumQ = summary.editors.reduce((a, x) => a + x.qualityBonusCents, 0);
  const lastRow = resumo.addRow([
    "TOTAIS",
    "",
    "",
    brlNumber(summary.totals.totalSalaryCents),
    brlNumber(sumDel),
    brlNumber(sumAd),
    brlNumber(sumQ),
    brlNumber(summary.totals.totalNetCents),
    brlNumber(summary.totals.totalNetCents),
  ]);
  lastRow.font = { bold: true };

  for (let c = 4; c <= 9; c++) {
    resumo.getColumn(c).numFmt = moneyFmt;
  }
  resumo.getColumn(1).width = 28;
  resumo.getColumn(2).width = 14;
  resumo.getColumn(3).width = 18;

  const ent = workbook.addWorksheet("Entregas", { views: [{ state: "frozen", ySplit: 1 }] });
  ent.addRow([
    "Gestor",
    "Data",
    "Tipo",
    "Título",
    "Task ID",
    "Status",
    "Tier",
    "Retrabalho",
    "Qualidade",
    "Prazo",
    "KPI total",
    "Valor base (R$)",
    "Bônus total (R$)",
    "Parte do gestor (R$)",
    "Investimento USD",
    "ROAS",
  ]);
  ent.getRow(1).font = { bold: true };
  for (const r of entregaRows) {
    ent.addRow(r);
  }
  ent.getColumn(2).numFmt = "dd/mm/yyyy";
  for (const c of [12, 13, 14]) {
    ent.getColumn(c).numFmt = moneyFmt;
  }
  ent.getColumn(1).width = 24;
  ent.getColumn(4).width = 28;
  ent.getColumn(5).width = 14;

  const raw = await workbook.xlsx.writeBuffer();
  const buffer = Buffer.from(raw);
  return { buffer, monthKey };
}
