import { UserProfile } from "@/types/profile";
import { ScenarioChanges } from "@/types/scenario";
import { Line, SimulationResult } from "@/types/simulation";
import { incomeTax, soli, socialContributions, taxableIncome } from "./tax";
import { project } from "./projection";
import { commuterAllowanceDeduction } from "./insights";
import { WERBUNGSKOSTEN_PAUSCHBETRAG } from "./constants";

function applyChanges(profile: UserProfile, changes?: ScenarioChanges): UserProfile {
  if (!changes) return profile;
  return {
    ...profile,
    grossSalary: changes.grossSalary ?? profile.grossSalary,
    city: changes.city ?? profile.city,
    monthlyRent: changes.monthlyRent ?? profile.monthlyRent,
    sideIncome: changes.sideIncome ?? profile.sideIncome,
    employmentType: changes.employmentType ?? profile.employmentType,
    workingHoursPct: changes.workingHoursPct ?? profile.workingHoursPct,
    relationshipStatus: changes.relationshipStatus ?? profile.relationshipStatus,
    children: changes.children ?? profile.children,
    monthlyExpenses: changes.monthlyExpenses ?? profile.monthlyExpenses,
  };
}

const BASE_ASSUMPTIONS = [
  "Tax year 2026",
  "Tax class I (single)",
  "No church tax",
  "Simplified Vorsorgepauschale",
  "No investment return applied",
  "5-year horizon",
];

/**
 * Applies `changes` over `profile` and runs the full annual + 5-year projection.
 * Deterministic, pure, no I/O — the only place euro amounts on screen come from.
 */
export function simulate(profile: UserProfile, changes?: ScenarioChanges): SimulationResult {
  const p = applyChanges(profile, changes);

  const salaryScale = p.workingHoursPct / 100;
  const scaledSalary = p.grossSalary * salaryScale;
  const gross = scaledSalary + p.sideIncome;

  const oneOffCost = changes?.oneOffCost ?? 0;
  const commuterDeduction = commuterAllowanceDeduction(p.commuteKm);
  const itemizedWerbungskosten = commuterDeduction + oneOffCost;

  const sv = socialContributions(gross, p.children);
  const zvE = taxableIncome(gross, p.children, itemizedWerbungskosten);
  const tax = incomeTax(zvE);
  const solidarity = soli(tax);
  const net = gross - sv.total - tax - solidarity;

  const housing = p.monthlyRent * 12;
  const expenses = p.monthlyExpenses * 12;
  // CLAUDE.md's calibration table defines disposable income as net minus rent only
  // (e.g. 43,776 - 15,000 = 28,776) — living expenses are reported separately in the
  // breakdown but are not netted out of this headline figure.
  const disposable = net - housing - oneOffCost;

  const projection = project(p.savings, disposable, 5, 2026);

  const breakdown: Line[] = [
    { label: "Gross income", amount: gross, certainty: "known" },
    { label: "Social contributions", amount: -sv.total, certainty: "estimated" },
    { label: "Income tax", amount: -tax, certainty: "estimated" },
    { label: "Solidarity surcharge", amount: -solidarity, certainty: "estimated" },
    { label: "Net income", amount: net, certainty: "estimated" },
    { label: "Rent", amount: -housing, certainty: "known" },
    { label: "Living expenses", amount: -expenses, certainty: "assumed" },
  ];
  if (oneOffCost) {
    breakdown.push({ label: "One-off cost", amount: -oneOffCost, certainty: "known" });
  }

  const assumptions = [...BASE_ASSUMPTIONS];
  let confidence = 1.0;
  if (!changes?.monthlyExpenses) {
    assumptions.push(`Living expenses assumed at €${p.monthlyExpenses}/month`);
    confidence -= 0.15;
  }
  if (changes?.city && !changes.monthlyRent) {
    assumptions.push(`Rent for ${p.city} assumed from city median`);
    confidence -= 0.15;
  }
  if (itemizedWerbungskosten > WERBUNGSKOSTEN_PAUSCHBETRAG) {
    assumptions.push(
      `Itemized deductions (commute + equipment) of €${Math.round(itemizedWerbungskosten)} used instead of the €${WERBUNGSKOSTEN_PAUSCHBETRAG} flat allowance`
    );
  }
  if (oneOffCost) {
    assumptions.push("Work equipment assumed fully deductible in the year of purchase");
  }

  return {
    annualGrossIncome: gross,
    socialContributions: sv.total,
    incomeTax: tax,
    soli: solidarity,
    annualNetIncome: net,
    annualHousing: housing,
    annualExpenses: expenses,
    annualDisposableIncome: disposable,
    projection,
    breakdown,
    assumptions,
    confidence: Math.max(0.3, confidence),
  };
}

/**
 * Bisection over gross salary (60 iterations): the salary at which `target`'s annual
 * disposable income equals `base`'s. Rounded to the nearest 100.
 */
export function breakEvenSalary(base: UserProfile, target: ScenarioChanges): number {
  const baseDisposable = simulate(base).annualDisposableIncome;

  let lo = 10_000;
  let hi = 500_000;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    const result = simulate(base, { ...target, grossSalary: mid });
    if (result.annualDisposableIncome < baseDisposable) {
      lo = mid;
    } else {
      hi = mid;
    }
  }
  return Math.round(hi / 100) * 100;
}
