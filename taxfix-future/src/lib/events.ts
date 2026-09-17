import { UserProfile } from "@/types/profile";
import { FutureDelta, SimulationResult } from "@/types/simulation";
import { simulate } from "@/simulation/simulate";
import { deductionTiming } from "@/simulation/insights";

export interface LifeEvent {
  id: string;
  label: string;
  /** Permanent profile change this event represents, if any. */
  patch?: Partial<Pick<UserProfile, "grossSalary" | "monthlyRent" | "sideIncome" | "commuteKm">>;
  /** A one-off deduction pulled into the current tax year instead of a future one. */
  writeOffAmount?: number;
}

export const LIFE_EVENTS: LifeEvent[] = [
  { id: "raise", label: "Salary bump logged", patch: { grossSalary: 78_000 } },
  { id: "commuter", label: "Optimized commuter allowance", patch: { commuteKm: 34 } },
  { id: "writeoff", label: "Smarter write-off timing", writeOffAmount: 2_500 },
  { id: "rent", label: "Rent increase", patch: { monthlyRent: 1_420 } },
  { id: "side", label: "Freelance income", patch: { sideIncome: 6_000 } },
];

const PROJECTION_YEAR = 2030;

function valueAt(result: SimulationResult, year: number): number {
  return result.projection.find((s) => s.year === year)?.savings ?? 0;
}

function addCashBoost(result: SimulationResult, boost: number): SimulationResult {
  if (!boost) return result;
  return {
    ...result,
    projection: result.projection.map((s) => ({ ...s, savings: s.savings + boost })),
  };
}

function simulateEvent(profile: UserProfile, event: LifeEvent): SimulationResult {
  const patched = event.patch ? { ...profile, ...event.patch } : profile;
  const base = simulate(patched);
  if (event.writeOffAmount) {
    const saving = deductionTiming(profile, event.writeOffAmount).taxSaved;
    return addCashBoost(base, saving);
  }
  return base;
}

/**
 * Fires one or more life events together and diffs the projection at `PROJECTION_YEAR`.
 * Drivers use Shapley-lite attribution: each event applied in isolation against the same
 * baseline. If they don't sum to the combined total within €50, the remainder is reported
 * as "interaction between changes" rather than silently balanced away.
 */
export function applyEvents(profile: UserProfile, ids: string[]): {
  before: SimulationResult;
  after: SimulationResult;
  delta: FutureDelta;
} {
  const events = LIFE_EVENTS.filter((e) => ids.includes(e.id));
  const before = simulate(profile);
  const beforeValue = valueAt(before, PROJECTION_YEAR);

  const patchedProfile = events.reduce(
    (p, e) => (e.patch ? { ...p, ...e.patch } : p),
    profile
  );
  let after = simulate(patchedProfile);
  const totalWriteOffBoost = events
    .filter((e) => e.writeOffAmount)
    .reduce((sum, e) => sum + deductionTiming(patchedProfile, e.writeOffAmount!).taxSaved, 0);
  after = addCashBoost(after, totalWriteOffBoost);
  const afterValue = valueAt(after, PROJECTION_YEAR);

  const drivers = events.map((e) => {
    const isolated = simulateEvent(profile, e);
    return {
      label: e.label,
      amount: Math.round(valueAt(isolated, PROJECTION_YEAR) - beforeValue),
    };
  });

  const driverSum = drivers.reduce((s, d) => s + d.amount, 0);
  const total = Math.round(afterValue - beforeValue);
  const remainder = total - driverSum;
  if (Math.abs(remainder) > 50) {
    drivers.push({ label: "Interaction between changes", amount: remainder });
  }
  drivers.sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));

  return {
    before,
    after,
    delta: {
      projectionYear: PROJECTION_YEAR,
      before: Math.round(beforeValue),
      after: Math.round(afterValue),
      drivers,
    },
  };
}

export function applyEvent(profile: UserProfile, id: string) {
  return applyEvents(profile, [id]);
}
