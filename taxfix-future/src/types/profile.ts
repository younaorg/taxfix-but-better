export type EmploymentType = "employee" | "self_employed" | "mixed";
export type RelationshipStatus = "single" | "married";

export interface UserProfile {
  name: string;
  age: number;
  city: string;
  grossSalary: number; // annual EUR
  monthlyRent: number; // EUR
  sideIncome: number; // annual EUR, gross
  employmentType: EmploymentType;
  workingHoursPct: number; // 100 = full time
  relationshipStatus: RelationshipStatus;
  children: number;
  monthlyExpenses: number; // EUR, excl. rent
  savings: number; // current savings, EUR
  hasChurchTax: boolean;
  commuteKm: number; // one-way commute distance, for Entfernungspauschale
}
