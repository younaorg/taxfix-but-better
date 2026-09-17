export type Certainty = "known" | "estimated" | "assumed";
export interface Line { label: string; amount: number; certainty: Certainty }
export interface SimulationResult {
  label: string;
  annualGrossIncome: number;
  socialContributions: number;
  incomeTax: number;
  soli: number;
  annualNetIncome: number;
  annualHousing: number;
  annualExpenses: number;
  oneOffCosts: number;
  annualDisposableIncome: number;
  projection: { year: number; savings: number }[];
  breakdown: Line[];
  assumptions: string[];
  confidence: number; // 0..1
}

// Below this line: shared with src/store.ts, src/agents/* and src/components/DemoControls.tsx.

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
  projectionYear: number;
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
