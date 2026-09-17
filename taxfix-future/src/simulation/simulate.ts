import { UserProfile } from "../types/profile";
import { ScenarioChanges } from "../types/scenario";
import { Line, SimulationResult } from "../types/simulation";
import { socialContributions, taxableIncome, incomeTax, soli } from "./tax";
import { project } from "./projection";

interface MergedProfile {
  city: string;
  employmentType: UserProfile["employmentType"];
  grossSalary: number;
  sideIncome: number;
  monthlyRent: number;
  relationshipStatus: UserProfile["relationshipStatus"];
  children: number;
  monthlyExpenses: number;
  oneOffCost: number;
  workingHoursPct: number;
}

function applyChanges(profile: UserProfile, changes?: ScenarioChanges): MergedProfile {
  return {
    city: changes?.city ?? profile.city,
    employmentType: changes?.employmentType ?? profile.employmentType,
    grossSalary: changes?.grossSalary ?? profile.grossSalary,
    sideIncome: changes?.sideIncome ?? profile.sideIncome,
    monthlyRent: changes?.monthlyRent ?? profile.monthlyRent,
    relationshipStatus: changes?.relationshipStatus ?? profile.relationshipStatus,
    children: changes?.children ?? profile.children,
    monthlyExpenses: changes?.monthlyExpenses ?? profile.monthlyExpenses,
    oneOffCost: changes?.oneOffCost ?? 0,
    workingHoursPct: changes?.workingHoursPct ?? 100,
  };
}

export function simulate(profile: UserProfile, changes?: ScenarioChanges): SimulationResult {
  const merged = applyChanges(profile, changes);

  const scaledGrossSalary = merged.grossSalary * (merged.workingHoursPct / 100);
  const gross = scaledGrossSalary + merged.sideIncome;

  const sv = socialContributions(gross, merged.children);
  const zvE = taxableIncome(gross, merged.children);
  const tax = incomeTax(zvE);
  const soliAmt = soli(tax);
  const net = gross - sv.total - tax - soliAmt;

  const housing = merged.monthlyRent * 12;
  const expenses = merged.monthlyExpenses * 12;
  const oneOff = merged.oneOffCost;

  // CLAUDE.md's calibration table defines disposable income as net minus rent
  // only (e.g. 43,776 - 15,000 = 28,776) — living expenses are reported
  // separately in the breakdown but are not netted out of this headline figure.
  const disposable = net - housing - oneOff;

  const projection = project(profile.currentSavings, disposable, 5, profile.taxYear);

  const breakdown: Line[] = [
    { label: "Gross income", amount: gross, certainty: "known" },
    { label: "Social contributions", amount: -sv.total, certainty: "estimated" },
    { label: "Income tax", amount: -tax, certainty: "estimated" },
    { label: "Solidarity surcharge", amount: -soliAmt, certainty: "estimated" },
    { label: "Net income", amount: net, certainty: "estimated" },
    { label: "Housing", amount: -housing, certainty: "known" },
    { label: "Living expenses", amount: -expenses, certainty: "known" },
  ];
  if (oneOff !== 0) {
    breakdown.push({ label: "One-off cost", amount: -oneOff, certainty: "known" });
  }
  breakdown.push({ label: "Disposable income", amount: disposable, certainty: "estimated" });

  const assumptions: string[] = [
    "Tax year 2026",
    "Tax class I",
    "No church tax",
    "Simplified Vorsorgepauschale",
    "No investment return",
    "5-year horizon",
  ];
  if (changes?.city && changes.city !== profile.city) {
    assumptions.push(
      "Germany has no municipal income tax — moving cities changes rent and cost of living, not income tax"
    );
  }

  const assumedLines = breakdown.filter((l) => l.certainty === "assumed").length;
  const confidence = Math.max(0.3, 1 - 0.15 * assumedLines);

  return {
    label: merged.city,
    annualGrossIncome: gross,
    socialContributions: sv.total,
    incomeTax: tax,
    soli: soliAmt,
    annualNetIncome: net,
    annualHousing: housing,
    annualExpenses: expenses,
    oneOffCosts: oneOff,
    annualDisposableIncome: disposable,
    projection,
    breakdown,
    assumptions,
    confidence,
  };
}

// Bisection over gross salary, 60 iterations. Returns the salary at which `target`
// (applied on top of `base`) matches base's own annual disposable income.
export function breakEvenSalary(base: UserProfile, target: ScenarioChanges): number {
  const baseline = simulate(base).annualDisposableIncome;

  let lo = 0;
  let hi = 1_000_000;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    const result = simulate(base, { ...target, grossSalary: mid });
    if (result.annualDisposableIncome < baseline) {
      lo = mid;
    } else {
      hi = mid;
    }
  }
  return Math.round(hi / 100) * 100;
}
