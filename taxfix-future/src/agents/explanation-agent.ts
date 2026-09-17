import { z } from "zod";
import { structured } from "@/lib/llm";

export interface ExplanationFacts {
  grossDelta: string;
  netDelta: string;
  retentionPct: string;
  rentDelta: string;
  disposableDelta: string;
  disposableDeltaMonthly: string;
  breakEvenSalary: string;
  fromCity: string;
  toCity: string;
  unmodelled: string[];
}

export interface Explanation {
  headline: string;
  body: string;
  breakEvenNote: string;
  caveat: string;
}

const explanationSchema: z.ZodType<Explanation> = z.object({
  headline: z.string().max(90),
  body: z.string(),
  breakEvenNote: z.string(),
  caveat: z.string(),
});

const BANNED = [
  "you will",
  "guaranteed",
  "you should",
  "best option",
  "definitely",
  "i recommend",
];

const SYSTEM_PROMPT = `You explain the result of a financial simulation to a non-expert in Germany.

You are given pre-computed, pre-formatted figures. Use them exactly as written.
Never compute, adjust, round, or invent a figure. Never add a figure that is not in the input.

Style:
- Plain language. No tax jargon. No "Einkommensteuer", no "marginal rate".
- Lead with the gap between the headline number and the real number.
- Everything is a model of the future, so hedge every projection: "estimated",
  "under these assumptions", "roughly". Never "you will".
- Never recommend a decision. Describe what the scenario models. The person decides.
- The caveat names the single largest thing the model does NOT include.
- No exclamation marks. No emoji. Confident, calm, short.`;

function containsBanned(text: string): boolean {
  const lower = text.toLowerCase();
  return BANNED.some((b) => lower.includes(b));
}

function containsUnlistedFigure(text: string, facts: ExplanationFacts): boolean {
  const allowed = new Set(
    Object.values(facts)
      .flat()
      .flatMap((v) => String(v).match(/€[\d,.]+/g) ?? [])
  );
  const found = text.match(/€[\d,.]+/g) ?? [];
  return found.some((f) => !allowed.has(f));
}

function fallbackExplanation(facts: ExplanationFacts): Explanation {
  return {
    headline: `${facts.grossDelta} more on paper is ${facts.disposableDeltaMonthly} in your pocket.`,
    body: `About ${facts.retentionPct} of the change survives income tax and social contributions — roughly ${facts.netDelta} a year. Moving from ${facts.fromCity} to ${facts.toCity} changes rent by ${facts.rentDelta}. Under these assumptions the scenario models to about ${facts.disposableDelta} a year different.`,
    breakEvenNote: `A ${facts.toCity} offer would need to reach about ${facts.breakEvenSalary} to match your current position.`,
    caveat: `This doesn't include ${facts.unmodelled.join(", ") || "moving costs or day-to-day changes in spending"}.`,
  };
}

export async function explain(
  facts: ExplanationFacts
): Promise<{ explanation: Explanation; source: "llm" | "cache" | "fallback" }> {
  try {
    const result = await structured({
      schema: explanationSchema,
      system: SYSTEM_PROMPT,
      user: JSON.stringify(facts),
      temperature: 0.4,
      cacheKey: `explain:${JSON.stringify(facts)}`,
    });
    const text = `${result.data.headline} ${result.data.body} ${result.data.breakEvenNote} ${result.data.caveat}`;
    if (containsBanned(text) || containsUnlistedFigure(text, facts)) {
      throw new Error("Explanation failed the copy-rule assertion");
    }
    return { explanation: result.data, source: result.source };
  } catch {
    return { explanation: fallbackExplanation(facts), source: "fallback" };
  }
}
