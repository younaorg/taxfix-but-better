# AGENTS.md — Taxfix Future

Two audiences, one file.

- **If you are a coding agent working in this repo:** read `CLAUDE.md` first — it holds the
  build rules, lane ownership and the 120-minute plan. Then read §0 and §6 here.
- **If you are implementing the product's AI layer:** this is the spec. §1–§5 define each
  agent's contract, prompt, validation and fallback.

---

## 0. The one principle

```
LLM ≠ calculator
```

The language model decides **what to compute** and **how to say it**.
`src/simulation/` decides **what the numbers are**.

Any code path where a model's output reaches the screen as a euro amount is a defect.
This is also the answer to the judge who asks "how do I know it's not hallucinating?" —
the answer is architectural, not a prompt instruction, and that is the point.

Consequences:

- Agents return **structured objects**, never prose containing figures they invented.
- Every agent output is validated with **Zod** before it touches the store.
- Every agent has a **deterministic fallback** that runs when the model is slow, wrong, or
  unreachable. The conference wifi will fail. Plan for it.
- Agents are **stateless**. The digital twin lives in the Zustand store, not in a chat history.

---

## 1. Agent map

| Agent | Input | Output | Uses LLM? | Lane | Beat |
|---|---|---|---|---|---|
| **Profile** | onboarding answers | `UserProfile` | No (MVP: stubbed) | B | 1 |
| **Scenario** | free text | `Scenario` | **Yes** — structured output | C | 2 |
| **Simulation engine** | `UserProfile` + `Scenario` | `SimulationResult` | **No, never** | A | 3 |
| **Explanation** | two `SimulationResult`s | narrative strings | **Yes** — constrained | C | 4 |
| **Future Search** | constraints | ranked `Scenario[]` | **Partly** — config in, labels out | D | 5 |
| **Change Detector** | old vs new twin | delta summary | No (deterministic) | E | 6 |

Three LLM call sites total. If you find a fourth, delete it.

---

## 2. Scenario Agent

Turns *"I got offered €90k in Munich, rent's €1,650, worth it?"* into a structured change set.

### 2.1 Output contract

```ts
// src/types/scenario.ts  — FROZEN AT T+10
export interface ScenarioChanges {
  grossSalary?: number;        // annual EUR
  city?: string;               // German city name, title case
  monthlyRent?: number;        // EUR
  sideIncome?: number;         // annual EUR, gross
  employmentType?: "employee" | "self_employed" | "mixed";
  workingHoursPct?: number;    // 100 = full time, 80 = 4 days
  relationshipStatus?: "single" | "married";
  children?: number;
  monthlyExpenses?: number;    // EUR, excl. rent
  oneOffCost?: number;         // EUR, e.g. moving costs, equipment
}

export interface Scenario {
  id: string;
  name: string;                // ≤ 4 words, e.g. "Munich at €90k"
  changes: ScenarioChanges;
  inferred: string[];          // fields the model guessed rather than read
  missing: string[];           // fields that would materially improve the answer
  confidence: "high" | "medium" | "low";
}
```

Rules the model must follow, enforced in code afterwards:

- **Only fields the user actually changed.** Unmentioned fields are omitted, not copied.
- `"90k"`, `"90.000"`, `"€90,000"`, `"neunzigtausend"` all → `90000`.
- Rent is stated **monthly**; salary is stated **annually**. If the user says
  `"€5,000 a month"` for salary, multiply by 12 and add `"salary stated monthly"` to `inferred`.
- If the user names a city but no rent, put `monthlyRent` in `missing` — **do not invent one**.
  Lane D's `src/data/cities.ts` provides a median rent, and the UI labels it *Assumed*.
- Never emit a `Scenario` with zero changes. If nothing parses, return `confidence: "low"`
  and let the UI ask a follow-up question.

### 2.2 System prompt

```
You convert a person's description of a life decision into a structured scenario object
for a German personal-finance simulator.

You do not calculate anything. You do not estimate taxes, net income, or savings.
You only extract what the person said they might change.

Rules:
- Output only fields the person explicitly changed. Omit everything else.
- Salary is annual gross in EUR. Rent is monthly in EUR.
- "90k" = 90000. German formatting ("90.000", "1.650") uses . as a thousands separator.
- If the person mentions a city but not rent, list "monthlyRent" in `missing`.
- If you had to guess a value, list that field name in `inferred`.
- `name` is at most 4 words, describing the scenario, not the person.
- Never invent a number the person did not say or clearly imply.

Today is {TODAY}. The person currently: {PROFILE_SUMMARY}
```

`{PROFILE_SUMMARY}` is one line generated from the store, e.g.
`lives in Berlin, employee, €72,000 gross, €1,250 rent, single, no children`.
It matters — it lets the model resolve *"a 10k raise"* and *"move back"*.

### 2.3 Few-shot set (also the eval set — all 12 must pass)

| Input | Expected `changes` |
|---|---|
| `I got offered 90k in Munich, apartment is 1650` | `{grossSalary:90000, city:"Munich", monthlyRent:1650}` |
| `what if I move to Hamburg` | `{city:"Hamburg"}` + `missing:["monthlyRent"]` |
| `should I ask for a 10k raise` | `{grossSalary:82000}` + `inferred:["grossSalary"]` |
| `I want to go down to 4 days a week` | `{workingHoursPct:80, grossSalary:57600}` + `inferred:["grossSalary"]` |
| `thinking about freelancing on the side, maybe 500/month` | `{sideIncome:6000}` |
| `we're getting married next year` | `{relationshipStatus:"married"}` |
| `having a kid` | `{children:1}` |
| `moving to a 1900 euro flat in Berlin` | `{monthlyRent:1900}` |
| `I'd make 5000 a month instead` | `{grossSalary:60000}` + `inferred:["salary stated monthly"]` |
| `quitting to freelance full time at 100k` | `{employmentType:"self_employed", grossSalary:100000}` |
| `buying a 3000 euro laptop for work` | `{oneOffCost:3000}` |
| `nothing, just curious` | `{}`, `confidence:"low"` |

### 2.4 Fallback parser (required, not optional)

`parseScenarioFallback(text, profile): Scenario` — pure regex/heuristics, no network.
Runs when: the API errors, the call exceeds **4,000ms**, or Zod validation fails.

Must handle at minimum:

```ts
/(\d+[.,]?\d*)\s*k\b/i                    → salary in thousands
/(\d{2,3}[.,]\d{3})/                      → German-formatted amounts
/\b(München|Munich|Berlin|Hamburg|Köln|Cologne|Frankfurt|Stuttgart|Leipzig)\b/i
/(?:miete|rent|apartment|flat|wohnung)[^\d]{0,20}(\d[\d.,]*)/i
/(\d)\s*(?:tage|days)\s*(?:die woche|a week|per week)/i
```

Heuristic: the **largest** number in the sentence is salary, a number between 400 and 4,000 is
monthly rent. Crude, correct for the demo sentence, and it never leaves you with a blank screen.

Set `confidence: "low"` and surface `"Parsed offline"` in the assumptions drawer when this path
is taken. Honesty is cheap and it looks deliberate.

### 2.5 Endpoint

```
POST /api/scenario/parse
  { prompt: string, profile: UserProfile }
→ { scenario: Scenario, source: "llm" | "cache" | "fallback", latencyMs: number }
```

Cache key: `normalise(prompt)` → `src/data/prompt-cache.ts`. The demo sentence is pre-seeded
so beat 2 is instant. `?offline=1` forces `cache → fallback` and skips the network entirely.

---

## 3. Explanation Agent

Takes two `SimulationResult` objects and writes the sentences around the numbers.

### 3.1 Contract

```ts
interface Explanation {
  headline: string;     // ≤ 90 chars, the reveal
  body: string;         // 2–3 sentences
  breakEvenNote: string;// 1 sentence
  caveat: string;       // 1 sentence, the biggest unmodelled factor
}
```

### 3.2 The critical design decision

The model is **handed the numbers already formatted as strings** and told to place them, not
compute them. Pass a facts object:

```json
{
  "grossDelta": "+€18,000",
  "netDelta": "+€9,556",
  "retentionPct": "53%",
  "rentDelta": "+€4,800/year",
  "disposableDelta": "+€4,756/year",
  "disposableDeltaMonthly": "+€396/month",
  "breakEvenSalary": "€80,800",
  "fromCity": "Berlin", "toCity": "Munich",
  "unmodelled": ["moving costs", "commute", "church tax"]
}
```

### 3.3 System prompt

```
You explain the result of a financial simulation to a non-expert in Germany.

You are given pre-computed, pre-formatted figures. Use them exactly as written.
Never compute, adjust, round, or invent a figure. Never add a figure that is not in the input.

Style:
- Plain language. No tax jargon. No "Einkommensteuer", no "marginal rate".
- Lead with the gap between the headline number and the real number.
- Everything is a model of the future, so hedge every projection: "estimated",
  "under these assumptions", "roughly". Never "you will".
- Never recommend a decision. Describe what the scenario models. The person decides.
- The caveat names the single largest thing the model does NOT include.
- No exclamation marks. No emoji. Confident, calm, short.
```

### 3.4 Banned strings (assert in code, fail loudly in dev)

`"you will"` · `"guaranteed"` · `"you should"` · `"best option"` · `"definitely"` ·
`"I recommend"` · any `€` amount not present in the facts object.

### 3.5 Golden output (what beat 4 should read like)

> **€18,000 more on paper is €396 a month in your pocket.**
>
> About 53% of the raise survives income tax and social contributions — roughly €9,556 a year.
> Munich rent takes another €4,800 of that. Under these assumptions the move leaves you around
> €4,756 a year better off.
>
> A Munich offer would need to reach about €80,800 to match your current Berlin position.
>
> This doesn't include moving costs, a longer commute, or any change in day-to-day spending.

If the live model produces something worse than this, ship this as a cached response.
Cache it in `src/data/prompt-cache.ts` regardless — beat 4 is the beat we cannot lose.

---

## 4. Future Search Agent

The showpiece. **Mostly not an LLM**, and that is a feature.

### 4.1 Three stages

```
constraints (UI sheet, + optional free text)
        │
        ▼  ← LLM only if the user typed free text
  SearchConfig  { cities[], salaryRange, rentCap, sideIncomeRange, allowedMoves[] }
        │
        ▼  ← pure deterministic grid, no model
  simulate() × N          (N ≈ 1,500–3,000)
        │
        ▼  ← pure deterministic selection
  3 survivors: maximiseDisposable | minimiseChange | exploreMove
        │
        ▼  ← LLM, labels only
  card titles + one-line rationale per card
```

### 4.2 The grid

```ts
for (const city of cities)                    // 3–5
  for (let s = min; s <= max; s += 2000)      // ~15
    for (const rent of rentBand(city))        // ~4
      for (const side of [0, 3000, 6000, 12000])   // 4
        results.push(simulate(profile, { city, grossSalary: s, monthlyRent: rent/12, sideIncome: side }))
```

3 × 15 × 4 × 4 = 720. Widen the salary step to €1,000 and add a working-hours axis to reach
~2,800. **Pick the axes so the count lands between 1,500 and 3,000** — the counter on screen is
part of the demo, and a number like `1,847` reads as real in a way `2,000` does not.

Budget: `simulate()` is <1ms, so 3,000 runs is <400ms. If it stutters, move it to a Web Worker
and stream progress. Do not fake the progress bar — it is genuinely computing, let it say so.

### 4.3 Selection (deterministic, no model)

| Objective | Rule |
|---|---|
| `maximiseDisposable` | highest 10-year disposable income total |
| `minimiseChange` | highest disposable **among** scenarios with `city === current && rent === current` |
| `exploreMove` | highest disposable among scenarios with `city !== current` |

Then de-duplicate: if two survivors differ by <€1,000/year **or** share the same city and a
salary within €4,000, drop one and take the next best. Three *materially different* futures is
the requirement; three near-identical rows kills the moment.

### 4.4 Labelling call

Input: the 3 survivors as `{city, salary, sideIncome, rent, disposableDelta}` — already
computed. Output: `{title: string; rationale: string}[]`, title ≤ 3 words, rationale ≤ 15 words,
no figures beyond those supplied. Same hedging rules as §3.3.

### 4.5 What the agent must never do

- Rank the futures as "best". The UI shows three **options with trade-offs**, in no order of
  merit. The pitch line is *"Not the objectively best life — three worth exploring."*
- Include a scenario that violates a user constraint. Filter **before** ranking, and assert.
- Claim any of these are offers, listings, or available jobs. They are parameter combinations.

---

## 5. Change Detector (beat 6) — deterministic

No LLM. When the twin changes, diff the two `SimulationResult`s:

```ts
interface FutureDelta {
  projectionYear: 2030;
  before: number;
  after: number;
  drivers: { label: string; amount: number }[];  // sorted by |amount|
}
```

Drivers come from re-running `simulate()` with each changed field applied in isolation —
a **Shapley-lite** attribution. Cheap (n extra runs), explainable, and it means the breakdown
on screen actually adds up. If it does not sum to the total within €50, put the remainder in a
line called `"interaction between changes"` — do not silently balance it.

Demo event: `€72,000 → €78,000` → net `€43,776 → €47,060` (+€3,284/yr) →
2030 projection moves by roughly **+€13,000** once compounding assumptions are applied.
Lane E: animate the number, do not cut to it.

---

## 6. Shared engineering rules for all agents

```ts
// src/lib/llm.ts  — single call site, owner: Lane C
export async function structured<T>(opts: {
  schema: z.ZodType<T>;
  system: string;
  user: string;
  timeoutMs?: number;   // default 4000
  cacheKey?: string;
}): Promise<{ data: T; source: "llm" | "cache" }>;
```

- **One** module makes network calls. No `fetch` to a model anywhere else.
- `temperature: 0` for Scenario and Search config. `0.4` for Explanation and labels.
- Validate with Zod, then **repair once** (one retry with the validation error appended), then
  fall back. Never a third attempt — that is 12 seconds of dead air on stage.
- Log `{agent, source, latencyMs, valid}` to the console. During the rehearsal you want to see
  which calls are actually hitting the model.
- Never send the full profile where a summary line will do. Smaller prompt, faster call.
- No streaming. Beat 2 should feel like a computation completing, not a chatbot typing.

### Failure-mode table

| Failure | Behaviour | Visible to user |
|---|---|---|
| Model timeout (>4s) | fallback parser / cached explanation | "Parsed offline" chip |
| Zod validation fails | one repair attempt, then fallback | same |
| Empty `changes` | UI asks one clarifying question | "What would change?" |
| Constraint violated in search | scenario filtered pre-ranking | nothing |
| Network entirely down | `?offline=1` behaviour automatically | assumptions drawer notes it |
| Model returns a euro figure in prose | assertion throws in dev, string stripped in prod | nothing |

---

## 7. Why this architecture is the pitch

When a judge asks *"isn't this just ChatGPT with a nice UI?"*, the answer is this file:

> The model never touches the arithmetic. It reads your sentence and writes the explanation.
> Between those two steps sits a deterministic German tax engine, and a search that runs two
> thousand simulations in under half a second. That's why the number on screen is the same
> number every time you ask.

That is the difference between a demo and a product, and it takes ten seconds to say.
