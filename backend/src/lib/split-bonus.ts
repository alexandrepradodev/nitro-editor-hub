/** Reparte centavos entre N partes com o resto na última (igual fechamento / entregas). */
export function splitCents(totalCents: number, count: number): number[] {
  if (count <= 0) return [];
  const base = Math.floor(totalCents / count);
  const remainder = totalCents - base * count;
  return Array.from({ length: count }, (_, idx) => (idx === count - 1 ? base + remainder : base));
}

export function mapEditorBonuses(editorIds: string[], totalCents: number) {
  return splitCents(totalCents, editorIds.length).map((bonusCents, idx) => ({
    editorId: editorIds[idx],
    bonusCents,
  }));
}
