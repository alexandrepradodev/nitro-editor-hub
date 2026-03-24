import type { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";

function monthKeyFromDate(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function parseDateInput(dateInput: Date | string) {
  if (dateInput instanceof Date) return dateInput;
  const [year, month, day] = dateInput.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

type ClosingReader = Prisma.TransactionClient | typeof prisma;

export async function assertMonthIsOpen(dateInput: Date | string, client?: ClosingReader) {
  const db = client ?? prisma;
  const monthKey = monthKeyFromDate(parseDateInput(dateInput));

  const closedPeriod = await db.closingPeriod.findUnique({
    where: { monthKey },
    select: { id: true },
  });

  if (closedPeriod) {
    throw new Error(`Periodo ${monthKey} ja foi fechado e nao pode ser alterado.`);
  }
}

