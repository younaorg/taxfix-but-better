import type { UserProfile } from "@/types/profile";
import type { ScenarioChanges } from "@/types/scenario";
import type { FutureDelta, SimulationResult } from "@/types/simulation";
import { simulate } from "@/simulation/simulate";

export const LIFE_EVENTS: { id: string; label: string; patch: ScenarioChanges }[] =
  [
    { id: "raise", label: "New salary detected", patch: { grossSalary: 78_000 } },
    { id: "rent", label: "Rent increase", patch: { monthlyRent: 1_420 } },
    { id: "side", label: "Freelance income", patch: { sideIncome: 6_000 } },
  ];

export function applyEvent(
  profile: UserProfile,
  id: string,
): { before: SimulationResult; after: SimulationResult; delta: FutureDelta } {
  const event = LIFE_EVENTS.find((e) => e.id === id);
  if (!event) {
    const before = simulate(profile);
    return {
      before,
      after: before,
      delta: { projectionYear: 2030, before: 0, after: 0, drivers: [] },
    };
  }
  const before = simulate(profile);
  const after = simulate(profile, event.patch);
  const savingsAt = (r: SimulationResult) =>
    r.projection.find((p) => p.year === 2030)?.savings ??
    r.projection[r.projection.length - 1]?.savings ??
    0;
  const beforeSav = savingsAt(before);
  const afterSav = savingsAt(after);
  const drivers: { label: string; amount: number }[] = [];
  for (const [label, amount] of Object.entries(event.patch)) {
    if (amount === undefined) continue;
    const isolated = simulate(profile, { [label]: amount } as ScenarioChanges);
    drivers.push({
      label,
      amount: savingsAt(isolated) - beforeSav,
    });
  }
  drivers.sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));
  const sum = drivers.reduce((s, d) => s + d.amount, 0);
  const total = afterSav - beforeSav;
  if (Math.abs(sum - total) > 50) {
    drivers.push({ label: "interaction between changes", amount: total - sum });
  }
  return {
    before,
    after,
    delta: { projectionYear: 2030, before: beforeSav, after: afterSav, drivers },
  };
}
