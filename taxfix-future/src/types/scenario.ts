export interface ScenarioChanges {
  grossSalary?: number; // annual EUR
  city?: string; // German city name, title case
  monthlyRent?: number; // EUR
  sideIncome?: number; // annual EUR, gross
  employmentType?: "employee" | "self_employed" | "mixed";
  workingHoursPct?: number; // 100 = full time, 80 = 4 days
  relationshipStatus?: "single" | "married";
  children?: number;
  monthlyExpenses?: number; // EUR, excl. rent
  oneOffCost?: number; // EUR, e.g. moving costs, equipment
}

export interface Scenario {
  id: string;
  name: string; // <= 4 words, e.g. "Munich at €90k"
  changes: ScenarioChanges;
  inferred: string[]; // fields the model guessed rather than read
  missing: string[]; // fields that would materially improve the answer
  confidence: "high" | "medium" | "low";
}
