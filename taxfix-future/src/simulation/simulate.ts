import type { UserProfile } from "@/types/profile";
import type { ScenarioChanges } from "@/types/scenario";
import type { SimulationResult } from "@/types/simulation";

// STUB: Lane A replaces this body. Keep these signatures identical.
const GOLDEN: Record<number, { sv: number; tax: number; net: number }> = {
  72_000: { sv: 15_409, tax: 12_815, net: 43_776 },
  78_000: { sv: 16_045, tax: 14_895, net: 47_060 },
  84_000: { sv: 16_681, tax: 17_078, net: 50_241 },
  90_000: { sv: 17_317, tax: 19_351, net: 53_332 },
  98_000: { sv: 18_165, tax: 22_398, net: 57_436 },
};

export function applyChanges(
  profile: UserProfile,
  changes?: ScenarioChanges,
): UserProfile {
  if (!changes) return profile;
  return {
    ...profile,
    ...(changes.grossSalary !== undefined ? { grossSalary: changes.grossSalary } : {}),
    ...(changes.city !== undefined ? { city: changes.city } : {}),
    ...(changes.monthlyRent !== undefined ? { monthlyRent: changes.monthlyRent } : {}),
    ...(changes.sideIncome !== undefined ? { sideIncome: changes.sideIncome } : {}),
    ...(changes.employmentType !== undefined
      ? { employmentType: changes.employmentType }
      : {}),
    ...(changes.workingHoursPct !== undefined
      ? { workingHoursPct: changes.workingHoursPct }
      : {}),
    ...(changes.relationshipStatus !== undefined
      ? { relationshipStatus: changes.relationshipStatus }
      : {}),
    ...(changes.children !== undefined ? { children: changes.children } : {}),
    ...(changes.monthlyExpenses !== undefined
      ? { monthlyExpenses: changes.monthlyExpenses }
      : {}),
  };
}

function nearestGolden(gross: number) {
  const keys = Object.keys(GOLDEN).map(Number);
  let best = keys[0];
  for (const k of keys) {
    if (Math.abs(k - gross) < Math.abs(best - gross)) best = k;
  }
  return GOLDEN[best];
}

export function simulate(
  profile: UserProfile,
  changes?: ScenarioChanges,
): SimulationResult {
  const p = applyChanges(profile, changes);
  const gross =
    p.grossSalary * (p.workingHoursPct / 100) + p.sideIncome;
  const roundedGross = Math.round(gross);
  const row = GOLDEN[roundedGross] ?? nearestGolden(roundedGross);
  const oneOff = changes?.oneOffCost ?? 0;
  const annualHousing = p.monthlyRent * 12;
  const annualExpenses = p.monthlyExpenses * 12 + oneOff;
  const annualDisposableIncome = row.net - annualHousing - annualExpenses;
  const assumptions = [
    "Tax year 2026",
    "Tax class I",
    "No church tax",
    "Simplified Vorsorgepauschale",
    "No investment return",
    "5-year horizon",
    "STUB simulate — Lane A replaces this",
  ];
  const projection = Array.from({ length: 5 }, (_, i) => ({
    year: 2026 + i,
    savings: p.savings + annualDisposableIncome * i,
  }));
  return {
    annualGrossIncome: roundedGross,
    socialContributions: row.sv,
    incomeTax: row.tax,
    soli: 0,
    annualNetIncome: row.net,
    annualHousing,
    annualExpenses,
    annualDisposableIncome,
    projection,
    breakdown: [
      { label: "Gross salary", amount: p.grossSalary, certainty: "known" },
      { label: "Social contributions", amount: row.sv, certainty: "estimated" },
      { label: "Income tax", amount: row.tax, certainty: "estimated" },
      { label: "Housing", amount: annualHousing, certainty: "known" },
    ],
    assumptions,
    confidence: 0.4,
  };
}

export function breakEvenSalary(
  _base: UserProfile,
  _target: ScenarioChanges,
): number {
  // STUB: Lane A replaces with bisection. Demo Munich rent match.
  return 80_800;
}
