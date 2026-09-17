import { UserProfile } from "../types/profile";
import { SimulationResult } from "../types/simulation";
import { simulate } from "./simulate";
import { CITIES, City } from "../data/cities";

export interface SearchConfig {
  cities: string[];
  salaryMin: number;
  salaryMax: number;
  salaryStep: number;
  rentPointsPerCity: number;
  sideIncomeOptions: number[];
  workingHoursOptions: number[];
}

export interface Ranked {
  city: string;
  grossSalary: number;
  monthlyRent: number;
  sideIncome: number;
  workingHoursPct: number;
  result: SimulationResult;
  cumulativeDisposable: number; // 5-year cumulative disposable income
}

// ~4 cities x 18 salary steps x 4 rent points x 4 side-income x 2 working-hours = 2,304
export const DEFAULT_SEARCH_CONFIG: SearchConfig = {
  cities: CITIES.slice(0, 4).map((c) => c.name),
  salaryMin: 50_000,
  salaryMax: 135_000,
  salaryStep: 5_000,
  rentPointsPerCity: 4,
  sideIncomeOptions: [0, 3_000, 6_000, 12_000],
  workingHoursOptions: [100, 80],
};

function rentPoints(city: City, n: number): number[] {
  if (n <= 1) return [city.medianRent1BR];
  const [low, high] = city.rentBand;
  const step = (high - low) / (n - 1);
  return Array.from({ length: n }, (_, i) => Math.round(low + step * i));
}

export function runSearch(
  profile: UserProfile,
  config: SearchConfig = DEFAULT_SEARCH_CONFIG,
  onProgress?: (evaluated: number) => void
): { evaluated: number; all: Ranked[]; elapsedMs: number } {
  const start = performance.now();
  const all: Ranked[] = [];
  let evaluated = 0;

  const cityObjects = config.cities
    .map((name) => CITIES.find((c) => c.name === name))
    .filter((c): c is City => Boolean(c));

  for (const city of cityObjects) {
    const rents = rentPoints(city, config.rentPointsPerCity);
    for (const monthlyRent of rents) {
      for (
        let grossSalary = config.salaryMin;
        grossSalary <= config.salaryMax;
        grossSalary += config.salaryStep
      ) {
        for (const sideIncome of config.sideIncomeOptions) {
          for (const workingHoursPct of config.workingHoursOptions) {
            const result = simulate(profile, {
              city: city.name,
              monthlyRent,
              grossSalary,
              sideIncome,
              workingHoursPct,
            });
            all.push({
              city: city.name,
              grossSalary,
              monthlyRent,
              sideIncome,
              workingHoursPct,
              result,
              cumulativeDisposable: result.annualDisposableIncome * 5,
            });
            evaluated++;
            if (onProgress && evaluated % 100 === 0) onProgress(evaluated);
          }
        }
      }
    }
  }

  all.sort((a, b) => b.cumulativeDisposable - a.cumulativeDisposable);
  const elapsedMs = performance.now() - start;
  console.log(`runSearch: evaluated ${evaluated} scenarios in ${elapsedMs.toFixed(1)}ms`);
  return { evaluated, all, elapsedMs };
}

function isTooSimilar(a: Ranked, b: Ranked): boolean {
  const disposableDiff = Math.abs(a.result.annualDisposableIncome - b.result.annualDisposableIncome);
  if (disposableDiff < 1_000) return true;
  if (a.city === b.city && Math.abs(a.grossSalary - b.grossSalary) < 4_000) return true;
  return false;
}

function pickDistinct(sorted: Ranked[], alreadyPicked: Ranked[]): Ranked {
  for (const candidate of sorted) {
    if (alreadyPicked.every((picked) => !isTooSimilar(candidate, picked))) {
      return candidate;
    }
  }
  // Nothing left is distinct enough — fall back to the best candidate anyway.
  return sorted[0];
}

// Exactly 3 materially different futures. Returned unranked — never label one "best".
export function selectThree(all: Ranked[], profile: UserProfile): Ranked[] {
  const byDisposableDesc = [...all].sort(
    (a, b) => b.cumulativeDisposable - a.cumulativeDisposable
  );

  const maximiseDisposable = byDisposableDesc[0];

  const sameSituation = byDisposableDesc.filter(
    (r) => r.city === profile.city && r.monthlyRent === profile.monthlyRent
  );
  const minimiseChange = pickDistinct(
    sameSituation.length > 0 ? sameSituation : byDisposableDesc,
    [maximiseDisposable]
  );

  const differentCity = byDisposableDesc.filter((r) => r.city !== profile.city);
  const exploreMove = pickDistinct(differentCity.length > 0 ? differentCity : byDisposableDesc, [
    maximiseDisposable,
    minimiseChange,
  ]);

  return [maximiseDisposable, minimiseChange, exploreMove];
}
