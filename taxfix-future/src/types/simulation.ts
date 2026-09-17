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
