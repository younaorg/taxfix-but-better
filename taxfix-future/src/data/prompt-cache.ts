import { Scenario } from "@/types/scenario";

function normalise(text: string): string {
  return text
    .toLowerCase()
    .replace(/[.,!?€]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

const ENTRIES: { prompt: string; scenario: Scenario }[] = [
  {
    prompt: "I got offered €90k in Munich, the apartment is €1,650. Is it worth it?",
    scenario: {
      id: "munich-90k",
      name: "Munich at €90k",
      changes: { grossSalary: 90_000, city: "Munich", monthlyRent: 1_650 },
      inferred: [],
      missing: [],
      confidence: "high",
    },
  },
  {
    prompt: "What if I move to Hamburg",
    scenario: {
      id: "hamburg-move",
      name: "Move to Hamburg",
      changes: { city: "Hamburg" },
      inferred: [],
      missing: ["monthlyRent"],
      confidence: "medium",
    },
  },
  {
    prompt: "Should I ask for a 10k raise",
    scenario: {
      id: "raise-10k",
      name: "€10k raise",
      changes: { grossSalary: 82_000 },
      inferred: ["grossSalary"],
      missing: [],
      confidence: "medium",
    },
  },
  {
    prompt: "buying a 2500 euro workstation for work",
    scenario: {
      id: "workstation-2500",
      name: "Workstation purchase",
      changes: { oneOffCost: 2_500 },
      inferred: [],
      missing: [],
      confidence: "high",
    },
  },
  {
    prompt: "What if I freelance on the side for 500 a month",
    scenario: {
      id: "side-freelance",
      name: "Freelance side income",
      changes: { sideIncome: 6_000 },
      inferred: [],
      missing: [],
      confidence: "high",
    },
  },
  {
    prompt: "what if I go part time in berlin",
    scenario: {
      id: "part-time-berlin",
      name: "Part-time in Berlin",
      changes: { workingHoursPct: 50 },
      inferred: ["workingHoursPct"],
      missing: [],
      confidence: "high",
    },
  },
  {
    prompt: "what if I go part time",
    scenario: {
      id: "part-time",
      name: "Part-time",
      changes: { workingHoursPct: 50 },
      inferred: ["workingHoursPct"],
      missing: [],
      confidence: "high",
    },
  },
];

const CACHE = new Map(ENTRIES.map((e) => [normalise(e.prompt), e.scenario]));

export function getCachedScenario(prompt: string): Scenario | undefined {
  return CACHE.get(normalise(prompt));
}

export const DEMO_PROMPT = ENTRIES[0].prompt;
