export function eur(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(n);
}

export function eurMonth(n: number): string {
  return `${eur(n)}/mo`;
}

/** Rounded to the nearest 100 — for anything projected more than a year out. */
export function eurRounded(n: number): string {
  return eur(Math.round(n / 100) * 100);
}

export function delta(n: number): string {
  const sign = n >= 0 ? "+" : "-";
  return `${sign}${eur(Math.abs(n))}`;
}

export function pct(n: number): string {
  return `${Math.round(n)}%`;
}
