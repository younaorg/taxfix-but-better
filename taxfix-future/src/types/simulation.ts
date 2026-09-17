export type Certainty = "known" | "estimated" | "assumed";

export interface Line {
  label: string;
  amount: number;
  certainty: Certainty;
}

export interface YearSnapshot {
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
  projection: YearSnapshot[]; // 5-year horizon, inclusive of start year
  breakdown: Line[];
  assumptions: string[];
  confidence: number; // 0..1
}

export interface FutureDelta {
  projectionYear: number;
  before: number;
  after: number;
  drivers: { label: string; amount: number }[]; // sorted by |amount| desc
}

export interface Ranked {
  city: string;
  grossSalary: number;
  monthlyRent: number;
  sideIncome: number;
  workingHoursPct: number;
  result: SimulationResult;
  cumulativeDisposable: number; // 5-year sum
}
