import { z } from "zod";
import type { UserProfile } from "@/types/profile";
import type { Scenario, ScenarioChanges } from "@/types/scenario";
import { getCachedScenario } from "@/data/prompt-cache";
import { structured } from "@/lib/llm";

const changesSchema = z.object({
  grossSalary: z.number().optional(),
  city: z.string().optional(),
  monthlyRent: z.number().optional(),
  sideIncome: z.number().optional(),
  employmentType: z.enum(["employee", "self_employed", "mixed"]).optional(),
  workingHoursPct: z.number().optional(),
  relationshipStatus: z.enum(["single", "married"]).optional(),
  children: z.number().optional(),
  monthlyExpenses: z.number().optional(),
  oneOffCost: z.number().optional(),
});

export const scenarioSchema = z.object({
  id: z.string(),
  name: z.string(),
  changes: changesSchema,
  inferred: z.array(z.string()),
  missing: z.array(z.string()),
  confidence: z.enum(["high", "medium", "low"]),
});

function profileSummary(profile: UserProfile): string {
  return `lives in ${profile.city}, ${profile.employmentType}, €${profile.grossSalary} gross, €${profile.monthlyRent} rent, ${profile.relationshipStatus}, ${profile.children} children`;
}

const CITIES: Record<string, string> = {
  münchen: "Munich",
  munich: "Munich",
  berlin: "Berlin",
  hamburg: "Hamburg",
  köln: "Cologne",
  koln: "Cologne",
  cologne: "Cologne",
  frankfurt: "Frankfurt",
  stuttgart: "Stuttgart",
  leipzig: "Leipzig",
};

function parseGermanAmount(raw: string): number {
  const s = raw.replace(/[€\s]/g, "");
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) {
    return Number(s.replace(/\./g, "").replace(",", "."));
  }
  if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(s)) {
    return Number(s.replace(/,/g, ""));
  }
  if (/^\d+[.,]\d{3}$/.test(s)) {
    return Number(s.replace(/[.,]/g, ""));
  }
  return Number(s.replace(",", "."));
}

export function parseScenarioFallback(
  text: string,
  profile: UserProfile,
): Scenario {
  const changes: ScenarioChanges = {};
  const inferred: string[] = [];
  const missing: string[] = [];

  const cityMatch = text.match(
    /\b(München|Munich|Berlin|Hamburg|Köln|Cologne|Frankfurt|Stuttgart|Leipzig)\b/i,
  );
  if (cityMatch) {
    changes.city = CITIES[cityMatch[1].toLowerCase()] ?? cityMatch[1];
  }

  const rentMatch = text.match(
    /(?:miete|rent|apartment|flat|wohnung)[^\d]{0,20}(\d[\d.,]*)/i,
  );
  if (rentMatch) {
    changes.monthlyRent = parseGermanAmount(rentMatch[1]);
  }

  const kMatch = text.match(/(\d+[.,]?\d*)\s*k\b/i);
  const germanAmt = text.match(/(\d{2,3}[.,]\d{3})/);
  const numbers = [...text.matchAll(/(\d[\d.,]*)/g)]
    .map((m) => parseGermanAmount(m[1]))
    .filter((n) => Number.isFinite(n) && n > 0);

  if (kMatch) {
    changes.grossSalary = parseGermanAmount(kMatch[1]) * 1000;
  } else if (germanAmt && parseGermanAmount(germanAmt[1]) >= 10_000) {
    changes.grossSalary = parseGermanAmount(germanAmt[1]);
  } else {
    const salaryish = numbers.filter((n) => n >= 5_000);
    const largest = salaryish.length ? Math.max(...salaryish) : 0;
    if (largest >= 5_000) changes.grossSalary = largest;
  }

  if (changes.monthlyRent === undefined) {
    const rentish = numbers.find((n) => n >= 400 && n <= 4_000);
    if (rentish !== undefined && rentish !== changes.grossSalary) {
      changes.monthlyRent = rentish;
    }
  }

  if (/\b(10k|10\.000|10,000)\b/i.test(text) && /raise/i.test(text)) {
    changes.grossSalary = profile.grossSalary + 10_000;
    inferred.push("grossSalary");
  }

  const days = text.match(/(\d)\s*(?:tage|days)\s*(?:die woche|a week|per week)/i);
  if (days) {
    changes.workingHoursPct = (Number(days[1]) / 5) * 100;
    changes.grossSalary = Math.round(
      profile.grossSalary * (changes.workingHoursPct / 100),
    );
    inferred.push("grossSalary");
  }

  const side = text.match(
    /(?:freelance|side|neben)[^\d]{0,30}(\d[\d.,]*)\s*(?:\/\s*month|a month|\/mo|im monat)?/i,
  );
  if (side) {
    const n = parseGermanAmount(side[1]);
    changes.sideIncome = n <= 4_000 ? n * 12 : n;
  }

  if (changes.city && changes.monthlyRent === undefined) {
    missing.push("monthlyRent");
  }

  const empty = Object.keys(changes).length === 0;
  return {
    id: `fallback-${Date.now()}`,
    name: changes.city
      ? `${changes.city}${changes.grossSalary ? ` at €${Math.round(changes.grossSalary / 1000)}k` : ""}`.trim()
      : "Parsed scenario",
    changes,
    inferred: [...inferred, "Parsed offline"],
    missing,
    confidence: empty ? "low" : "low",
  };
}

export async function parseScenario(
  prompt: string,
  profile: UserProfile,
  offline = false,
): Promise<{ scenario: Scenario; source: "llm" | "cache" | "fallback"; latencyMs: number }> {
  const t0 = Date.now();
  const cached = getCachedScenario(prompt);
  if (cached) {
    return { scenario: cached, source: "cache", latencyMs: Date.now() - t0 };
  }

  const system = `You convert a person's description of a life decision into a structured scenario for a German personal-finance simulator. You do not calculate anything. Output only fields the person explicitly changed. Salary is annual gross EUR; rent is monthly EUR. '90k' = 90000. German formatting uses . as a thousands separator. If a city is mentioned but not rent, list monthlyRent in \`missing\`. If you guessed a value, list the field in \`inferred\`. Never invent a number the person did not say. Today is ${new Date().toISOString().slice(0, 10)}. The person currently: ${profileSummary(profile)}
Return JSON: {id, name (<=4 words), changes, inferred, missing, confidence}.`;

  try {
    const { data, source } = await structured({
      schema: scenarioSchema,
      system,
      user: prompt,
      timeoutMs: 4000,
      temperature: 0,
      offline,
    });
    if (Object.keys(data.changes).length === 0) {
      data.confidence = "low";
    }
    console.log({
      agent: "scenario",
      source,
      latencyMs: Date.now() - t0,
      valid: true,
    });
    return { scenario: data, source, latencyMs: Date.now() - t0 };
  } catch {
    const scenario = parseScenarioFallback(prompt, profile);
    console.log({
      agent: "scenario",
      source: "fallback",
      latencyMs: Date.now() - t0,
      valid: true,
    });
    return { scenario, source: "fallback", latencyMs: Date.now() - t0 };
  }
}
