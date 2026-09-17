export type EmploymentType = "employee" | "self_employed" | "mixed";
export type RelationshipStatus = "single" | "married";

export interface UserProfile {
  name: string;
  age: number;
  city: string;
  occupation: string;
  grossSalary: number;
  monthlyRent: number;
  savings: number;
  sideIncome: number;
  employmentType: EmploymentType;
  workingHoursPct: number;
  relationshipStatus: RelationshipStatus;
  children: number;
  monthlyExpenses: number;
}
