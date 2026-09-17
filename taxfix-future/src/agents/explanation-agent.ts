import { z } from "zod";
import type { Explanation } from "@/types/simulation";
import { DEMO_EXPLANATION } from "@/data/prompt-cache";
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

const schema = z.object({
  headline: z.string(),
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

function stripBanned(text: string, facts: ExplanationFacts): string {
  let out = text;
  for (const b of BANNED) {
    const re = new RegExp(b, "gi");
    out = out.replace(re, "under these assumptions");
  }
  const allowed = Object.values(facts).flatMap((v) =>
    Array.isArray(v) ? v : [v],
  );
  out = out.replace(/€[\d.,]+/g, (m) => (allowed.includes(m) ? m : ""));
  return out.replace(/\s{2,}/g, " ").trim();
}

export function demoFacts(): ExplanationFacts {
  return {
    grossDelta: "+€18,000",
    netDelta: "+€9,556",
    retentionPct: "53%",
    rentDelta: "+€4,800/year",
    disposableDelta: "+€4,756/year",
    disposableDeltaMonthly: "+€396/month",
    breakEvenSalary: "€80,800",
    fromCity: "Berlin",
    toCity: "Munich",
    unmodelled: ["moving costs", "commute", "church tax"],
  };
}

export async function explain(
  facts: ExplanationFacts,
  offline = false,
): Promise<Explanation> {
  const isDemo =
    facts.toCity === "Munich" && facts.disposableDeltaMonthly === "+€396/month";
  if (isDemo) return DEMO_EXPLANATION;

  const system = `You explain the result of a financial simulation to a non-expert in Germany.
You are given pre-computed, pre-formatted figures. Use them exactly as written.
Never compute, adjust, round, or invent a figure. Never add a figure that is not in the input.
Style: Plain language. No tax jargon. Hedge every projection: estimated, under these assumptions, roughly. Never "you will". Never recommend a decision. No exclamation marks. No emoji.
Return JSON: {headline (<=90 chars), body (2-3 sentences), breakEvenNote, caveat}.`;

  try {
    const { data } = await structured({
      schema,
      system,
      user: JSON.stringify(facts),
      timeoutMs: 4000,
      temperature: 0.4,
      cacheKey: `explain:${facts.fromCity}:${facts.toCity}:${facts.grossDelta}`,
      offline,
    });
    return {
      headline: stripBanned(data.headline, facts).slice(0, 90),
      body: stripBanned(data.body, facts),
      breakEvenNote: stripBanned(data.breakEvenNote, facts),
      caveat: stripBanned(data.caveat, facts),
    };
  } catch {
    return {
      headline: `${facts.grossDelta} on paper is ${facts.disposableDeltaMonthly} in your pocket.`,
      body: `About ${facts.retentionPct} of the raise survives tax and social contributions — roughly ${facts.netDelta} a year. ${facts.toCity} rent is ${facts.rentDelta}. Under these assumptions that is around ${facts.disposableDelta}.`,
      breakEvenNote: `An offer in ${facts.toCity} would need to reach about ${facts.breakEvenSalary} to match ${facts.fromCity}.`,
      caveat: `This doesn't include ${facts.unmodelled.join(", ")}.`,
    };
  }
}
