import { z } from "zod";
import type { Ranked, SearchConfig } from "@/types/simulation";
import { structured } from "@/lib/llm";

const configSchema = z.object({
  cities: z.array(z.string()).optional(),
  salaryMin: z.number().optional(),
  salaryMax: z.number().optional(),
  salaryStep: z.number().optional(),
  rentPointsPerCity: z.number().optional(),
  sideIncomeOptions: z.array(z.number()).optional(),
  workingHoursOptions: z.array(z.number()).optional(),
});

const labelsSchema = z.object({
  cards: z.array(
    z.object({
      title: z.string(),
      rationale: z.string(),
    }),
  ),
});

export const DEFAULT_SEARCH_CONFIG: SearchConfig = {
  cities: ["Berlin", "Munich", "Hamburg", "Cologne"],
  salaryMin: 64_000,
  salaryMax: 98_000,
  salaryStep: 2_000,
  rentPointsPerCity: 4,
  sideIncomeOptions: [0, 3_000, 6_000, 12_000],
  workingHoursOptions: [80, 100],
};

export async function parseSearchConfig(
  text: string | undefined,
  fallback: SearchConfig,
  offline = false,
): Promise<SearchConfig> {
  if (!text?.trim()) return fallback;
  try {
    const { data } = await structured({
      schema: configSchema,
      system:
        "Turn constraints into a search config for a German finance simulator. Output only JSON fields you can fill. No euro amounts in prose. Salary annual EUR.",
      user: text,
      temperature: 0,
      timeoutMs: 4000,
      offline,
    });
    return {
      cities: data.cities?.length ? data.cities : fallback.cities,
      salaryMin: data.salaryMin ?? fallback.salaryMin,
      salaryMax: data.salaryMax ?? fallback.salaryMax,
      salaryStep: data.salaryStep ?? fallback.salaryStep,
      rentPointsPerCity: data.rentPointsPerCity ?? fallback.rentPointsPerCity,
      sideIncomeOptions: data.sideIncomeOptions ?? fallback.sideIncomeOptions,
      workingHoursOptions:
        data.workingHoursOptions ?? fallback.workingHoursOptions,
    };
  } catch {
    return fallback;
  }
}

const FALLBACK_LABELS = [
  { title: "Stay put", rationale: "Same city, more room to save" },
  { title: "Earn more", rationale: "Higher pay, current city" },
  { title: "Move city", rationale: "Different city, modelled disposable" },
];

export async function labelFutures(
  survivors: Pick<
    Ranked,
    "city" | "grossSalary" | "sideIncome" | "monthlyRent"
  >[],
  deltas: string[],
  offline = false,
): Promise<{ title: string; rationale: string }[]> {
  try {
    const { data } = await structured({
      schema: labelsSchema,
      system:
        "Label three financial scenarios. Title at most 3 words. Rationale at most 15 words. Use only supplied figures. Never rank as best. Hedge. No exclamation marks.",
      user: JSON.stringify(
        survivors.map((s, i) => ({
          city: s.city,
          salary: s.grossSalary,
          sideIncome: s.sideIncome,
          rent: s.monthlyRent,
          disposableDelta: deltas[i],
        })),
      ),
      temperature: 0.4,
      timeoutMs: 4000,
      offline,
    });
    return survivors.map((_, i) => data.cards[i] ?? FALLBACK_LABELS[i]);
  } catch {
    return FALLBACK_LABELS.slice(0, survivors.length);
  }
}
