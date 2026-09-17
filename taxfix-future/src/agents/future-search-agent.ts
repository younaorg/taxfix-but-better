import { z } from "zod";
import { Ranked } from "@/types/simulation";
import { WriteOffInsight } from "@/simulation/search";
import { structured } from "@/lib/llm";
import { eur, pct } from "@/lib/format";

export interface FutureLabel {
  title: string;
  rationale: string;
}

const labelsSchema: z.ZodType<FutureLabel[]> = z.array(
  z.object({ title: z.string().max(40), rationale: z.string().max(120) })
);

function fallbackLabels(survivors: Ranked[], currentCity: string): FutureLabel[] {
  return survivors.map((s) => {
    if (s.city === currentCity) {
      return {
        title: `Stay, optimize`,
        rationale: `Same city, tuned salary and hours — no move required.`,
      };
    }
    return {
      title: `${s.city}, €${Math.round(s.grossSalary / 1000)}k`,
      rationale: `A different city worth comparing on disposable income.`,
    };
  });
}

/** Labels the 3 already-computed survivors. May not invent any figure not supplied. */
export async function labelFutures(
  survivors: Ranked[],
  currentCity: string
): Promise<{ labels: FutureLabel[]; source: "llm" | "cache" | "fallback" }> {
  try {
    const facts = survivors.map((s) => ({
      city: s.city,
      salary: s.grossSalary,
      sideIncome: s.sideIncome,
      rent: s.monthlyRent,
      disposableDelta: eur(s.result.annualDisposableIncome),
    }));
    const result = await structured({
      schema: labelsSchema,
      system: `Given 3 already-computed financial scenarios, write a short title (<=3 words)
and a one-line rationale (<=15 words) for each. Do not rank them or call any of them "best".
Never state a euro figure that is not supplied to you.`,
      user: JSON.stringify(facts),
      temperature: 0.4,
    });
    return { labels: result.data, source: result.source };
  } catch {
    return { labels: fallbackLabels(survivors, currentCity), source: "fallback" };
  }
}

export function writeOffHeadline(insight: WriteOffInsight): string {
  return `Buy that ${eur(insight.amount)} ${insight.itemLabel} before December 31 instead of January. The state effectively co-sponsors ${pct(insight.effectiveRatePct)} of your setup.`;
}
