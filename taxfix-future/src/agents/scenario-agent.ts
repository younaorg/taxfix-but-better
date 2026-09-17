import { z } from "zod";
import { UserProfile } from "@/types/profile";
import { Scenario, ScenarioChanges } from "@/types/scenario";
import { structured } from "@/lib/llm";
import { getCachedScenario } from "@/data/prompt-cache";
import { CITIES } from "@/data/cities";

const scenarioSchema: z.ZodType<Scenario> = z.object({
  id: z.string(),
  name: z.string().max(60),
  changes: z.object({
    grossSalary: z.number().positive().optional(),
    city: z.string().optional(),
    monthlyRent: z.number().positive().optional(),
    sideIncome: z.number().min(0).optional(),
    employmentType: z.enum(["employee", "self_employed", "mixed"]).optional(),
    workingHoursPct: z.number().min(10).max(100).optional(),
    relationshipStatus: z.enum(["single", "married"]).optional(),
    children: z.number().min(0).optional(),
    monthlyExpenses: z.number().min(0).optional(),
    oneOffCost: z.number().min(0).optional(),
  }),
  inferred: z.array(z.string()),
  missing: z.array(z.string()),
  confidence: z.enum(["high", "medium", "low"]),
});

function profileSummary(profile: UserProfile): string {
  return `lives in ${profile.city}, ${profile.employmentType.replace("_", " ")}, €${profile.grossSalary} gross, €${profile.monthlyRent} rent, ${profile.relationshipStatus}, ${profile.children} children`;
}

const SYSTEM_PROMPT = `You convert a person's description of a life decision into a structured
scenario object for a German personal-finance simulator.

You do not calculate anything. You do not estimate taxes, net income, or savings.
You only extract what the person said they might change.

Rules:
- Output only fields the person explicitly changed. Omit everything else.
- Salary is annual gross in EUR. Rent is monthly in EUR.
- "90k" = 90000. German formatting ("90.000", "1.650") uses . as a thousands separator.
- If the person mentions a city but not rent, list "monthlyRent" in missing.
- If you had to guess a value, list that field name in inferred.
- name is at most 4 words, describing the scenario, not the person.
- Never invent a number the person did not say or clearly imply.
- id is a short kebab-case slug.`;

const CITY_PATTERN = new RegExp(
  `\\b(${CITIES.map((c) => c.name).join("|")}|München|Köln)\\b`,
  "i"
);
const CITY_ALIASES: Record<string, string> = { münchen: "Munich", köln: "Cologne" };

function normaliseCity(raw: string): string {
  const lower = raw.toLowerCase();
  return CITY_ALIASES[lower] ?? CITIES.find((c) => c.name.toLowerCase() === lower)?.name ?? raw;
}

/** Pure regex/heuristics, zero network. Runs on timeout, error, or Zod failure. */
export function parseScenarioFallback(text: string, profile: UserProfile): Scenario {
  const changes: ScenarioChanges = {};
  const inferred: string[] = [];
  const missing: string[] = [];

  const cityMatch = text.match(CITY_PATTERN);
  if (cityMatch) changes.city = normaliseCity(cityMatch[1]);

  const rentMatch = text.match(/(?:miete|rent|apartment|flat|wohnung)[^\d]{0,20}(\d[\d.,]*)/i);
  if (rentMatch) {
    changes.monthlyRent = parseGermanNumber(rentMatch[1]);
  }

  // workingHoursPct alone is enough — simulate() scales the existing full-time grossSalary
  // by it. Setting grossSalary here too would apply the hours cut twice.
  const daysMatch = text.match(/(\d)\s*(?:tage|days)\s*(?:die woche|a week|per week)/i);
  if (daysMatch) {
    const days = parseInt(daysMatch[1], 10);
    changes.workingHoursPct = Math.round((days / 5) * 100);
  } else if (/\bpart[\s-]?time\b|\bteilzeit\b/i.test(text)) {
    // No specific hours given — default to a common Teilzeit split (4 days/50%),
    // and say so, rather than dropping the request.
    changes.workingHoursPct = 50;
    inferred.push("workingHoursPct");
  } else if (/\bfull[\s-]?time\b|\bvollzeit\b/i.test(text)) {
    changes.workingHoursPct = 100;
    inferred.push("workingHoursPct");
  }

  const kMatch = text.match(/(\d+[.,]?\d*)\s*k\b/i);
  const germanAmount = text.match(/\b(\d{2,3}[.,]\d{3})\b/);
  const allNumbers = [
    ...(kMatch ? [parseFloat(kMatch[1].replace(",", ".")) * 1_000] : []),
    ...(germanAmount ? [parseGermanNumber(germanAmount[1])] : []),
    ...Array.from(text.matchAll(/\b(\d{3,7})\b/g)).map((m) => parseFloat(m[1])),
  ].filter((n) => n > 0);

  if (!changes.monthlyRent) {
    const rentCandidate = allNumbers.find((n) => n >= 400 && n <= 4_000);
    if (rentCandidate && /miete|rent|apartment|flat|wohnung/i.test(text)) {
      changes.monthlyRent = rentCandidate;
    }
  }

  if (!changes.grossSalary && !changes.sideIncome && !changes.oneOffCost) {
    const largest = allNumbers.length ? Math.max(...allNumbers) : undefined;
    if (largest && largest >= 5_000) {
      const isMonthly = /a month|per month|monatlich|\/mo/i.test(text);
      const isSide = /side|freelance|nebenjob|extra/i.test(text);
      const isEquipment = /laptop|equipment|workstation|desk|buy|purchase|kaufen/i.test(text);
      const value = isMonthly ? largest * 12 : largest;
      if (isMonthly) inferred.push("salary stated monthly");
      if (isEquipment) {
        changes.oneOffCost = value;
      } else if (isSide) {
        changes.sideIncome = value;
      } else {
        changes.grossSalary = value;
      }
    }
  }

  if (changes.city && !changes.monthlyRent) missing.push("monthlyRent");

  const hasChanges = Object.keys(changes).length > 0;
  return {
    id: `fallback-${Date.now()}`,
    name: summarise(changes),
    changes,
    inferred,
    missing,
    confidence: hasChanges ? "low" : "low",
  };
}

function parseGermanNumber(raw: string): number {
  return parseFloat(raw.replace(/\./g, "").replace(",", "."));
}

function summarise(changes: ScenarioChanges): string {
  const parts: string[] = [];
  if (changes.city) parts.push(changes.city);
  if (changes.workingHoursPct !== undefined && changes.workingHoursPct < 100) {
    parts.push("Part-time");
  } else if (changes.grossSalary) {
    parts.push(`€${Math.round(changes.grossSalary / 1000)}k`);
  }
  if (changes.sideIncome) parts.push("side income");
  if (changes.oneOffCost) parts.push("purchase");
  return parts.length ? parts.slice(0, 4).join(" ") : "Untitled scenario";
}

export async function parseScenario(
  prompt: string,
  profile: UserProfile
): Promise<{ scenario: Scenario; source: "llm" | "cache" | "fallback"; latencyMs: number }> {
  const started = performance.now();

  const cached = getCachedScenario(prompt);
  if (cached) {
    return { scenario: cached, source: "cache", latencyMs: performance.now() - started };
  }

  try {
    const result = await structured({
      schema: scenarioSchema,
      system: `${SYSTEM_PROMPT}\n\nToday is ${new Date().toISOString().slice(0, 10)}. The person currently: ${profileSummary(profile)}.`,
      user: prompt,
      temperature: 0,
    });
    return { scenario: result.data, source: "llm", latencyMs: result.latencyMs };
  } catch {
    const scenario = parseScenarioFallback(prompt, profile);
    scenario.inferred.push("Parsed offline");
    return { scenario, source: "fallback", latencyMs: performance.now() - started };
  }
}
