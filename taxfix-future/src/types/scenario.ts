import type { EmploymentType, RelationshipStatus } from "./profile";

export interface ScenarioChanges {
  grossSalary?: number;
  city?: string;
  monthlyRent?: number;
  sideIncome?: number;
  employmentType?: EmploymentType;
  workingHoursPct?: number;
  relationshipStatus?: RelationshipStatus;
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
