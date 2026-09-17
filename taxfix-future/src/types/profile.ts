export interface UserProfile {
  id: string;
  name: string;
  age: number;
  city: string;
  employmentType: "employee" | "self_employed" | "mixed";
  grossSalary: number;       // annual EUR
  sideIncome: number;        // annual EUR gross
  monthlyRent: number;       // EUR
  monthlyExpenses: number;   // EUR, excluding rent
  currentSavings: number;    // EUR
  relationshipStatus: "single" | "married";
  children: number;
  churchTax: boolean;
  taxYear: number;
}
