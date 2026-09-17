export type Certainty = "known" | "estimated" | "assumed";

export interface BreakdownLine {
  label: string;
  amount: number;
  certainty: Certainty;
}

export interface ProjectionPoint {
  year: number;
  savings: number;
}

export interface SimulationResult {
  annualGrossIncome: number;
  socialContributions: number;
  incomeTax: number;
  soli: number;
  annualNetIncome: number;
  annualHousing: number;
  annualExpenses: number;
  annualDisposableIncome: number;
  projection: ProjectionPoint[];
  breakdown: BreakdownLine[];
  assumptions: string[];
  confidence: number;
}

export interface SearchConfig {
  cities: string[];
  salaryMin: number;
  salaryMax: number;
  salaryStep: number;
  rentPointsPerCity: number;
  sideIncomeOptions: number[];
  workingHoursOptions: number[];
}

export interface Ranked {
  city: string;
  grossSalary: number;
  monthlyRent: number;
  sideIncome: number;
  workingHoursPct: number;
  result: SimulationResult;
  cumulativeDisposable: number;
  title?: string;
  rationale?: string;
}

export interface FutureDelta {
  projectionYear: 2030;
  before: number;
  after: number;
  drivers: { label: string; amount: number }[];
}

export interface Explanation {
  headline: string;
  body: string;
  breakEvenNote: string;
  caveat: string;
}

export interface LlmStatus {
  source: "llm" | "cache" | "fallback" | null;
  latencyMs: number | null;
}

export type AppView = "home" | "compare" | "search" | "changed";
