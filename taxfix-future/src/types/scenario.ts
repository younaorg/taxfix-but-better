export interface ScenarioChanges {
  grossSalary?: number;
  city?: string;
  monthlyRent?: number;
  sideIncome?: number;
  employmentType?: "employee" | "self_employed" | "mixed";
  workingHoursPct?: number;
  relationshipStatus?: "single" | "married";
  children?: number;
  monthlyExpenses?: number;
  oneOffCost?: number;
}
export interface Scenario {
  id: string;
  name: string;
  changes: ScenarioChanges;
  inferred: string[];
  missing: string[];
  confidence: "high" | "medium" | "low";
}
