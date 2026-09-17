import { YearSnapshot } from "@/types/simulation";

/**
 * Projects savings forward. Inclusive of the start year. 0% investment return by default;
 * if a return is ever applied it must surface as an explicit assumption string.
 */
export function project(
  startSavings: number,
  annualDisposable: number,
  years = 5,
  fromYear = 2026,
  annualReturnRate = 0
): YearSnapshot[] {
  const snapshots: YearSnapshot[] = [];
  let savings = startSavings;
  for (let i = 0; i <= years; i++) {
    if (i > 0) {
      savings = savings * (1 + annualReturnRate) + annualDisposable;
    }
    snapshots.push({ year: fromYear + i, savings: Math.round(savings) });
  }
  return snapshots;
}
