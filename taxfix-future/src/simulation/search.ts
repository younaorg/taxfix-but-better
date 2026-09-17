import type { UserProfile } from "@/types/profile";
import type { Ranked, SearchConfig, SimulationResult } from "@/types/simulation";
import { simulate } from "./simulate";

// STUB: Lane A replaces the grid. Signatures frozen.
export function runSearch(
  profile: UserProfile,
  config: SearchConfig,
  onProgress?: (evaluated: number) => void,
): { evaluated: number; all: Ranked[] } {
  const all: Ranked[] = [];
  let evaluated = 0;
  for (const city of config.cities) {
    for (let s = config.salaryMin; s <= config.salaryMax; s += config.salaryStep) {
      for (let r = 0; r < config.rentPointsPerCity; r++) {
        const monthlyRent = Math.round(profile.monthlyRent * (0.9 + r * 0.15));
        for (const sideIncome of config.sideIncomeOptions) {
          for (const workingHoursPct of config.workingHoursOptions) {
            const result: SimulationResult = simulate(profile, {
              city,
              grossSalary: s,
              monthlyRent,
              sideIncome,
              workingHoursPct,
            });
            const cumulativeDisposable = result.projection.reduce(
              (sum, p) => sum + (p.savings > 0 ? result.annualDisposableIncome : 0),
              0,
            );
            all.push({
              city,
              grossSalary: s,
              monthlyRent,
              sideIncome,
              workingHoursPct,
              result,
              cumulativeDisposable:
                result.annualDisposableIncome * result.projection.length,
            });
            evaluated += 1;
            if (evaluated % 100 === 0) onProgress?.(evaluated);
            void cumulativeDisposable;
          }
        }
      }
    }
  }
  onProgress?.(evaluated);
  all.sort((a, b) => b.cumulativeDisposable - a.cumulativeDisposable);
  return { evaluated, all };
}

export function selectThree(all: Ranked[], profile: UserProfile): Ranked[] {
  if (all.length === 0) return [];
  const maximise = all[0];
  const minimise =
    all.find(
      (r) => r.city === profile.city && r.monthlyRent === profile.monthlyRent,
    ) ?? all[Math.min(1, all.length - 1)];
  const explore =
    all.find((r) => r.city !== profile.city) ?? all[Math.min(2, all.length - 1)];
  const picked = [maximise, minimise, explore];
  const unique: Ranked[] = [];
  for (const p of picked) {
    const dup = unique.some(
      (u) =>
        (u.city === p.city && Math.abs(u.grossSalary - p.grossSalary) < 4_000) ||
        Math.abs(u.result.annualDisposableIncome - p.result.annualDisposableIncome) <
          1_000,
    );
    if (!dup) unique.push(p);
  }
  for (const r of all) {
    if (unique.length >= 3) break;
    const dup = unique.some(
      (u) =>
        (u.city === r.city && Math.abs(u.grossSalary - r.grossSalary) < 4_000) ||
        Math.abs(u.result.annualDisposableIncome - r.result.annualDisposableIncome) <
          1_000,
    );
    if (!dup) unique.push(r);
  }
  return unique.slice(0, 3);
}
