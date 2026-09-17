import { UserProfile } from "@/types/profile";
import { Ranked } from "@/types/simulation";
import { CITIES, cityByName } from "@/data/cities";
import { simulate } from "./simulate";
import { deductionTiming } from "./insights";

export interface SearchConfig {
  cities: string[];
  salaryMin: number;
  salaryMax: number;
  salaryStep: number;
  rentPointsPerCity: number;
  sideIncomeOptions: number[];
  workingHoursOptions: number[];
}

export function defaultSearchConfig(profile: UserProfile): SearchConfig {
  return {
    cities: CITIES.map((c) => c.name),
    salaryMin: Math.round((profile.grossSalary - 18_000) / 1000) * 1000,
    salaryMax: Math.round((profile.grossSalary + 46_000) / 1000) * 1000,
    salaryStep: 4_000,
    rentPointsPerCity: 3,
    sideIncomeOptions: [0, 3_000, 6_000, 12_000],
    workingHoursOptions: [100, 80],
  };
}

function rentPoints(low: number, high: number, count: number): number[] {
  if (count <= 1) return [(low + high) / 2];
  const step = (high - low) / (count - 1);
  return Array.from({ length: count }, (_, i) => Math.round(low + step * i));
}

/** Exhaustive grid search, no model in the loop. Pure, deterministic, <1ms per simulate(). */
export function runSearch(
  profile: UserProfile,
  config: SearchConfig,
  onProgress?: (evaluated: number) => void
): { evaluated: number; all: Ranked[]; elapsedMs: number } {
  const start = performance.now();
  const all: Ranked[] = [];
  let evaluated = 0;

  for (const cityName of config.cities) {
    const city = cityByName(cityName);
    if (!city) continue;
    const rents = rentPoints(city.rentBand[0], city.rentBand[1], config.rentPointsPerCity);

    for (
      let salary = config.salaryMin;
      salary <= config.salaryMax;
      salary += config.salaryStep
    ) {
      for (const rent of rents) {
        for (const sideIncome of config.sideIncomeOptions) {
          for (const workingHoursPct of config.workingHoursOptions) {
            const result = simulate(profile, {
              city: cityName,
              grossSalary: salary,
              monthlyRent: rent,
              sideIncome,
              workingHoursPct,
            });
            // 5-year cumulative disposable income, flat-rate over the horizon (project()
            // itself applies 0% investment return by default, so this stays consistent).
            const cumulativeDisposable = result.annualDisposableIncome * 5;

            all.push({
              city: cityName,
              grossSalary: salary,
              monthlyRent: rent,
              sideIncome,
              workingHoursPct,
              result,
              cumulativeDisposable,
            });
            evaluated++;
            if (onProgress && evaluated % 100 === 0) onProgress(evaluated);
          }
        }
      }
    }
  }
  if (onProgress) onProgress(evaluated);

  return { evaluated, all, elapsedMs: performance.now() - start };
}

function isDistinct(a: Ranked, b: Ranked): boolean {
  const yearlyDiff = Math.abs(a.cumulativeDisposable - b.cumulativeDisposable) / 5;
  if (yearlyDiff < 1_000) return false;
  if (a.city === b.city && Math.abs(a.grossSalary - b.grossSalary) < 4_000) return false;
  return true;
}

/** Deterministic selection of 3 materially different futures. Never ranked as "best". */
export function selectThree(all: Ranked[], profile: UserProfile): Ranked[] {
  const byDisposable = [...all].sort((a, b) => b.cumulativeDisposable - a.cumulativeDisposable);
  const sameCity = byDisposable.filter((r) => r.city === profile.city);
  const otherCity = byDisposable.filter((r) => r.city !== profile.city);

  const pools = [byDisposable, sameCity.length ? sameCity : byDisposable, otherCity.length ? otherCity : byDisposable];
  const picked: Ranked[] = [];

  for (const pool of pools) {
    const next = pool.find((r) => picked.every((p) => isDistinct(p, r)) && !picked.includes(r));
    picked.push(next ?? pool[0]);
  }
  return picked.slice(0, 3);
}

export interface WriteOffInsight {
  itemLabel: string;
  amount: number;
  taxSaved: number;
  effectiveRatePct: number;
}

const EQUIPMENT_CATALOG: { label: string; amount: number }[] = [
  { label: "workstation", amount: 2_500 },
  { label: "work laptop", amount: 1_800 },
  { label: "standing desk + monitor", amount: 900 },
  { label: "home office setup", amount: 3_500 },
];

/**
 * The "mic drop" hero insight: which planned purchase saves the most tax if itemized
 * this year instead of next. Not AI — a small deterministic scan over realistic amounts.
 */
export function findBestWriteOffInsight(profile: UserProfile): WriteOffInsight {
  const scored = EQUIPMENT_CATALOG.map((item) => ({
    itemLabel: item.label,
    ...deductionTiming(profile, item.amount),
  }));
  scored.sort((a, b) => b.taxSaved - a.taxSaved);
  return scored[0];
}
