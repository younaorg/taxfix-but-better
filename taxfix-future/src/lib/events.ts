import { UserProfile } from "../types/profile";
import { ScenarioChanges } from "../types/scenario";
import { SimulationResult } from "../types/simulation";
import { simulate } from "../simulation/simulate";

export interface LifeEvent {
  id: string;
  label: string;
  patch: ScenarioChanges;
}

export const LIFE_EVENTS: LifeEvent[] = [
  { id: "raise", label: "New salary detected", patch: { grossSalary: 78000 } },
  { id: "rent", label: "Rent increase", patch: { monthlyRent: 1420 } },
  { id: "side", label: "Freelance income", patch: { sideIncome: 6000 } },
];

export interface FutureDelta {
  projectionYear: number;
  before: number;
  after: number;
  drivers: { label: string; amount: number }[];
}

const FIELD_LABELS: Partial<Record<keyof ScenarioChanges, string>> = {
  grossSalary: "Salary change",
  city: "City change",
  monthlyRent: "Rent change",
  sideIncome: "Freelance income",
  employmentType: "Employment type change",
  workingHoursPct: "Working hours change",
  relationshipStatus: "Relationship status change",
  children: "Children change",
  monthlyExpenses: "Living expenses change",
  oneOffCost: "One-off cost",
};

const PROJECTION_YEAR = 2030;

function savingsAt(result: SimulationResult, year: number): number {
  const point = result.projection.find((p) => p.year === year);
  return point ? point.savings : result.projection[result.projection.length - 1].savings;
}

export function applyEvent(
  profile: UserProfile,
  id: string
): { before: SimulationResult; after: SimulationResult; delta: FutureDelta } {
  const event = LIFE_EVENTS.find((e) => e.id === id);
  if (!event) throw new Error(`Unknown life event: ${id}`);

  const before = simulate(profile);
  const after = simulate(profile, event.patch);

  const beforeAt = savingsAt(before, PROJECTION_YEAR);
  const afterAt = savingsAt(after, PROJECTION_YEAR);
  const total = afterAt - beforeAt;

  // Shapley-lite attribution: apply each changed field in isolation.
  const drivers = (Object.keys(event.patch) as (keyof ScenarioChanges)[]).map((key) => {
    const isolated = simulate(profile, { [key]: event.patch[key] } as ScenarioChanges);
    const isolatedAt = savingsAt(isolated, PROJECTION_YEAR);
    return { label: FIELD_LABELS[key] ?? key, amount: isolatedAt - beforeAt };
  });

  const driverSum = drivers.reduce((sum, d) => sum + d.amount, 0);
  const remainder = total - driverSum;
  if (Math.abs(remainder) > 50) {
    drivers.push({ label: "Interaction between changes", amount: remainder });
  }

  const delta: FutureDelta = { projectionYear: PROJECTION_YEAR, before: beforeAt, after: afterAt, drivers };
  console.log(`applyEvent(${id}): 2030 savings ${beforeAt} -> ${afterAt}`, delta);

  return { before, after, delta };
}
