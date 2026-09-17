export interface ProjectionPoint {
  year: number;
  savings: number;
}

// 0% investment return by default. If a return is ever applied, the caller must
// surface it as an explicit assumption string — it is never silently baked in here.
export function project(
  startSavings: number,
  annualDisposable: number,
  years = 5,
  fromYear = 2026
): ProjectionPoint[] {
  const points: ProjectionPoint[] = [];
  let savings = startSavings;
  for (let i = 0; i < years; i++) {
    points.push({ year: fromYear + i, savings: Math.round(savings) });
    savings += annualDisposable;
  }
  return points;
}
