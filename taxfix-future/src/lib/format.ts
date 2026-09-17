function round0(n: number): number {
  return Math.round(n);
}

function absGroup(n: number): string {
  return new Intl.NumberFormat("en-US").format(Math.abs(round0(n)));
}

/** "€43,776" */
export function eur(n: number): string {
  const formatted = `€${absGroup(n)}`;
  return n < 0 ? `-${formatted}` : formatted;
}

/** "€3,648/mo" */
export function eurMonth(n: number): string {
  return `${eur(n)}/mo`;
}

/** nearest €100, for projections more than a year out */
export function eurRounded(n: number): string {
  return eur(Math.round(n / 100) * 100);
}

/** "+€4,756" / "-€1,200" */
export function delta(n: number): string {
  const r = round0(n);
  if (r === 0) return "€0";
  return r > 0 ? `+${eur(r)}` : eur(r);
}

/** "53%" — pass a 0–1 ratio, or 0–100 points */
export function pct(n: number): string {
  const points = Math.abs(n) <= 1 ? n * 100 : n;
  return `${Math.round(points)}%`;
}
