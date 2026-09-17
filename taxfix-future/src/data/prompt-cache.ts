import type { Scenario } from "@/types/scenario";
import type { Explanation } from "@/types/simulation";

export function normalise(prompt: string): string {
  return prompt.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");
}

export const DEMO_PROMPT =
  "I got offered €90k in Munich, the apartment is €1,650. Is it worth it?";

export const DEMO_SCENARIO: Scenario = {
  id: "cache-munich-90k",
  name: "Munich at €90k",
  changes: { grossSalary: 90_000, city: "Munich", monthlyRent: 1_650 },
  inferred: [],
  missing: [],
  confidence: "high",
};

export const DEMO_EXPLANATION: Explanation = {
  headline: "€18,000 more on paper is €396 a month in your pocket.",
  body: "About 53% of the raise survives income tax and social contributions — roughly €9,556 a year. Munich rent takes another €4,800 of that. Under these assumptions the move leaves you around €4,756 a year better off.",
  breakEvenNote:
    "A Munich offer would need to reach about €80,800 to match your current Berlin position.",
  caveat:
    "This doesn't include moving costs, a longer commute, or any change in day-to-day spending.",
};

const SCENARIO_SEED: Record<string, Scenario> = {
  [normalise(DEMO_PROMPT)]: DEMO_SCENARIO,
  [normalise(
    "I got offered €90k in Munich, rent €1,650. Worth it?",
  )]: DEMO_SCENARIO,
  [normalise("I got offered 90k in Munich, apartment is 1650")]: DEMO_SCENARIO,
  [normalise("what if I move to Hamburg")]: {
    id: "cache-hamburg",
    name: "Move to Hamburg",
    changes: { city: "Hamburg" },
    inferred: [],
    missing: ["monthlyRent"],
    confidence: "medium",
  },
  [normalise("should I ask for a 10k raise")]: {
    id: "cache-10k-raise",
    name: "Berlin plus €10k",
    changes: { grossSalary: 82_000 },
    inferred: ["grossSalary"],
    missing: [],
    confidence: "medium",
  },
  [normalise("what if I freelance on the side for 500 a month")]: {
    id: "cache-side-500",
    name: "Side freelance",
    changes: { sideIncome: 6_000 },
    inferred: [],
    missing: [],
    confidence: "high",
  },
};

const LLM_CACHE = new Map<string, unknown>([
  ["explain:munich-90k", DEMO_EXPLANATION],
]);

export function getCachedScenario(prompt: string): Scenario | null {
  return SCENARIO_SEED[normalise(prompt)] ?? null;
}

export function getLlmCache<T>(key: string): T | undefined {
  return LLM_CACHE.get(key) as T | undefined;
}

export function setLlmCache<T>(key: string, value: T): void {
  LLM_CACHE.set(key, value);
}

export { SCENARIO_SEED };
