# Taxfix Future — briefs for the 2-person code team

Team is now: **2 on mobile UI · 1 on pitch · 2 on the brains** (you two).
Setup is already pushed, so the clock starts on real work.

The split below is chosen so the two of you almost never touch the same file:
**A owns everything deterministic. B owns everything that talks to a model or holds state.**

| | Owns | One-line job |
|---|---|---|
| **A** | `src/simulation/*`, `src/data/cities.ts`, `src/lib/events.ts`, `tests/` | Every number in the app |
| **B** | `src/agents/*`, `src/lib/llm.ts`, `src/lib/format.ts`, `src/store.ts`, `src/app/api/*`, `src/data/prompt-cache.ts`, `src/components/DemoControls.tsx` | Language in, language out, state, deploy |

Nobody on this pair writes product UI. The mobile pair binds to the store and calls
`simulate()`. Send them **THE CONTRACT** at the bottom of this file in the first five minutes —
they are blocked until they have it.

---

---

## MESSAGE TO A — the engine

> **You're A. You own every number that appears on screen.** Nothing the other three build
> means anything until your golden tests are green, so that's your first 30 minutes and
> nothing else. Shout in the group the moment they pass.
> You write zero React and you make zero network calls.
> Paste this into Claude Code:

```
I'm building the deterministic core of a German personal-finance simulator. The repo is
already scaffolded and types exist.

I own ONLY these files. Do not create or edit anything else, ever:
  src/simulation/constants.ts, tax.ts, projection.ts, simulate.ts, search.ts
  src/data/cities.ts
  src/lib/events.ts
  tests/simulation.test.ts

Read src/types/profile.ts, scenario.ts and simulation.ts first. They are frozen — do not
change them. src/simulation/simulate.ts currently contains a STUB that three other people
are already calling; replace its body but keep its exported signatures identical.

No React. No fetch. No LLM calls. Pure TypeScript throughout.

=== TASK 1 (do this first) — constants.ts ===
2026 German values, verified. Hardcode exactly these:
  GRUNDFREIBETRAG = 12_348
  BBG_RV_AV = 101_400        // pension + unemployment annual ceiling
  BBG_KV_PV = 69_750         // health + long-term care annual ceiling
  RV_EE = 0.186/2   AV_EE = 0.026/2   KV_EE = (0.146 + 0.029)/2
  PV_EE_CHILDLESS = 0.024    PV_EE_PARENT = 0.018
  SOLI_RATE = 0.055          SOLI_FREIGRENZE_SINGLE = 20_350   // of assessed income tax
  WERBUNGSKOSTEN = 1_230     SONDERAUSGABEN = 36

=== TASK 2 — tax.ts ===
incomeTax(zvE) per §32a EStG 2026, five zones, exactly:
  <= 12_348                          -> 0
  12_349..17_799   y=(zvE-12348)/10000  -> (914.51*y + 1400)*y
  17_800..69_878   z=(zvE-17799)/10000  -> (173.10*z + 2397)*z + 1034.87
  69_879..277_825                    -> 0.42*zvE - 11135.63
  277_826+                           -> 0.45*zvE - 19470.38
Floor the result to full euros — that is how the German tariff works.

socialContributions(gross, children) -> employee share only, each branch capped at its OWN
  ceiling (RV and AV at 101_400, KV and PV at 69_750). Return {rv, av, kv, pv, total}.

taxableIncome(gross, children) -> gross - (rv + kv + pv) - 1230 - 36
  Unemployment insurance (av) is NOT deductible. This is a simplification of the real
  Vorsorgepauschale — emit the assumption string "Simplified Vorsorgepauschale".

soli(tax) -> 0 below the Freigrenze; above it min(0.119*(tax - 20350), 0.055*tax)

=== TASK 3 — projection.ts ===
project(startSavings, annualDisposable, years = 5, fromYear = 2026) -> {year, savings}[]
Inclusive of the start year. 0% investment return by default; if a return is ever applied
it must surface as an explicit assumption string.

=== TASK 4 — simulate.ts (replace the stub, keep the signatures) ===
simulate(profile: UserProfile, changes?: ScenarioChanges): SimulationResult
  Apply `changes` over the profile, then:
    gross = grossSalary + sideIncome, scaling grossSalary by workingHoursPct/100 if present
    -> socialContributions -> incomeTax -> soli -> net
    housing = monthlyRent*12   expenses = monthlyExpenses*12   plus oneOffCost
    disposable = net - housing - expenses - oneOffCosts
    projection = 5 years
    breakdown: Line[] with certainty "known" for anything the user stated, "estimated" for
      anything the tax model computed, "assumed" for defaults we filled in
    assumptions: string[] — at minimum tax year 2026, tax class I, no church tax, simplified
      Vorsorgepauschale, no investment return, 5-year horizon, plus one line per defaulted field
    confidence: start at 1.0, subtract 0.15 per "assumed" line, floor 0.3

breakEvenSalary(base: UserProfile, target: ScenarioChanges): number
  Bisection over gross salary, 60 iterations. Returns the salary at which the target
  scenario's annualDisposableIncome equals the base's. Round to the nearest 100.

=== TASK 5 — tests/simulation.test.ts. These MUST pass within ±50 EUR ===
  gross 72000 -> SV 15409, zvE 56261, tax 12815, net 43776
  gross 78000 -> SV 16045, zvE 61703, tax 14895, net 47060
  gross 84000 -> SV 16681, zvE 67145, tax 17078, net 50241
  gross 90000 -> SV 17317, zvE 72587, tax 19351, net 53332
  gross 98000 -> SV 18165, zvE 79843, tax 22398, net 57436
  (all single, no children, no church tax)
Plus: Berlin 72k @ 1250 rent -> disposable 28776. Munich 90k @ 1650 rent -> 33532.
Difference 4756/year = 396/month. breakEvenSalary(Berlin base, Munich + 1650 rent) ≈ 80800.
Install vitest, add "test": "vitest run". Iterate until green.
STOP HERE AND TELL ME WHEN GREEN before starting task 6.

=== TASK 6 — src/data/cities.ts ===
Berlin, Munich, Hamburg, Cologne, Frankfurt, Stuttgart, Leipzig. Each with a median
1-bedroom monthly rent and a rent band [low, high] for the search.
Germany has NO city-level income tax — cities differ in rent only. Put that in a comment
so nobody adds a fake city tax later.

=== TASK 7 — search.ts, an exhaustive grid search, no model in the loop ===
runSearch(profile, config, onProgress?) -> {evaluated: number, all: Ranked[]}
  config = {cities[], salaryMin, salaryMax, salaryStep, rentPointsPerCity,
            sideIncomeOptions[], workingHoursOptions[]}
  Nested loops calling simulate() for every combination. Rank by 5-year cumulative
  disposable income. Call onProgress every ~100 scenarios with the running count.
  TUNE THE AXES so the total lands between 1500 and 3000 — roughly 4 cities x 18 salary
  steps x 4 rent points x 4 side-income x 2 working-hours. Print the count and the elapsed ms.
  Target under 400ms total. If it's slower, make it Web Worker friendly (no DOM, no imports
  from src/components).

selectThree(all, profile) -> exactly 3 results, deterministic:
  maximiseDisposable -> highest 5-year cumulative disposable
  minimiseChange     -> highest, restricted to same city AND same rent as today
  exploreMove        -> highest, restricted to a different city
  Then DE-DUPLICATE: if two winners differ by under €1,000/year, or share a city with
  salaries within €4,000, drop one and take the next best. Three materially DIFFERENT
  futures is the requirement. Return them unranked — never label one "best".

=== TASK 8 — src/lib/events.ts ===
LIFE_EVENTS = [
  {id: "raise", label: "New salary detected", patch: {grossSalary: 78000}},
  {id: "rent",  label: "Rent increase",       patch: {monthlyRent: 1420}},
  {id: "side",  label: "Freelance income",    patch: {sideIncome: 6000}},
]
applyEvent(profile, id) -> {before: SimulationResult, after: SimulationResult, delta: FutureDelta}
FutureDelta = {projectionYear: 2030, before: number, after: number,
               drivers: {label: string, amount: number}[]}
Compute `drivers` by re-running simulate() with EACH changed field applied in isolation —
Shapley-lite attribution. If the drivers don't sum to the total within €50, add the remainder
as a line called "interaction between changes". Never silently balance it.
Sanity check: the "raise" event should move net from 43776 to 47060 (+3284/year). Print the
resulting 2030 delta so I can hand it to the pitch person.

Start with tasks 1-5. Don't touch anything outside my file list.
```

---

---

## MESSAGE TO B — the AI layer, state and the demo machine

> **You're B. You own the words going in, the words coming out, the store the UI binds to,
> and the deploy.** Two things you cannot skip, no matter how behind we are: the **4s timeout
> with a regex fallback**, and **caching the demo sentence**. The wifi will die. Assume it will.
> Get `store.ts` and `format.ts` out in the first 15 minutes — the mobile pair is blocked
> on both. Deploy at T+85, not T+115.
> Paste this into Claude Code:

```
I'm building the AI layer, state and API of a financial life simulator. The repo is already
scaffolded and types exist.

I own ONLY these files. Do not create or edit anything else, ever:
  src/lib/llm.ts, src/lib/format.ts
  src/store.ts
  src/agents/scenario-agent.ts, explanation-agent.ts, future-search-agent.ts
  src/app/api/scenario/route.ts
  src/data/prompt-cache.ts, src/data/demo-profile.ts
  src/components/DemoControls.tsx

Read src/types/*.ts first — frozen, do not change. simulate(), breakEvenSalary(), runSearch()
and selectThree() live in src/simulation/ and are being written by someone else right now.
Import and call them. NEVER reimplement any tax or projection logic.

HARD RULE for this whole file set: the language model never produces a number that reaches
the screen. It only (a) turns a sentence into a Scenario object and (b) places already-
formatted strings into prose. If you catch yourself letting a model emit a euro amount,
that's the bug.

=== TASK 1 (first 15 min — two other people are blocked on this) ===
src/lib/format.ts:
  eur(n) -> "€43,776"   eurMonth(n) -> "€3,648/mo"
  eurRounded(n) -> "€94,200"  (nearest 100, for anything projected more than a year out)
  delta(n) -> "+€4,756" / "-€1,200", sign always shown
  pct(n) -> "53%"

src/store.ts, Zustand. This is the single source of truth the mobile UI binds to:
  profile: UserProfile                (seeded from ALEX in src/data/demo-profile.ts)
  scenario: Scenario | null
  baseResult: SimulationResult        (derived: simulate(profile))
  scenarioResult: SimulationResult | null
  searchState: {status: "idle"|"running"|"done", evaluated: number, results: Ranked[]}
  lastDelta: FutureDelta | null
  view: "home" | "compare" | "search" | "changed"
  llmStatus: {source: "llm"|"cache"|"fallback"|null, latencyMs: number|null}
  setProfile(patch)  setScenario(s)  setView(v)  runSearch(config)  fireEvent(id)  reset()
  Recompute baseResult and scenarioResult automatically whenever profile or scenario changes.
  Persist profile to localStorage; nothing else.
COMMIT AND PUSH THESE TWO FILES IMMEDIATELY, then tell me. Then continue.

=== TASK 2 — src/lib/llm.ts, the one and only network call site in the app ===
structured<T>({schema: ZodType<T>, system, user, timeoutMs = 4000, cacheKey})
  -> {data: T, source: "llm" | "cache"}
Check the cache first. On timeout or Zod failure: retry ONCE with the validation error
appended, then throw. Never a third attempt — that's 12 seconds of dead air on stage.
temperature 0 for parsing, 0.4 for prose. If the URL has ?offline=1, skip the network
entirely and serve from cache only.

=== TASK 3 — scenario-agent.ts ===
System prompt: "You convert a person's description of a life decision into a structured
scenario for a German personal-finance simulator. You do not calculate anything. Output only
fields the person explicitly changed. Salary is annual gross EUR; rent is monthly EUR.
'90k' = 90000. German formatting uses . as a thousands separator. If a city is mentioned but
not rent, list monthlyRent in `missing`. If you guessed a value, list the field in `inferred`.
Never invent a number the person did not say."
Pass the person's current situation as a one-line summary so "a 10k raise" resolves.
Zod-validate the output against the Scenario type.

ALSO write parseScenarioFallback(text, profile) — pure regex, zero network, used whenever the
model times out or fails validation. Must handle:
  /(\d+[.,]?\d*)\s*k\b/i                      thousands
  /(\d{2,3}[.,]\d{3})/                        German-formatted amounts
  /(München|Munich|Berlin|Hamburg|Köln|Cologne|Frankfurt|Stuttgart|Leipzig)/i
  /(?:miete|rent|apartment|flat|wohnung)[^\d]{0,20}(\d[\d.,]*)/i
Heuristic: the largest number in the sentence is salary; a number between 400 and 4000 is
monthly rent. Set confidence "low" and add "Parsed offline" to the assumptions. Do not hide it.

=== TASK 4 — src/data/prompt-cache.ts ===
Pre-seed the exact demo sentence with its correct parse:
  "I got offered €90k in Munich, the apartment is €1,650. Is it worth it?"
  -> {grossSalary: 90000, city: "Munich", monthlyRent: 1650}
Normalise keys (lowercase, strip punctuation and whitespace) so near-misses still hit.
Seed 3 more: "what if I move to Hamburg", "should I ask for a 10k raise",
"what if I freelance on the side for 500 a month".

=== TASK 5 — POST /api/scenario/parse ===
Body {prompt, profile}. Returns {scenario, source: "llm"|"cache"|"fallback", latencyMs}.
NEVER returns 500 — on any failure, fall back and return 200 with source "fallback".

=== TASK 6 — explanation-agent.ts ===
Hand the model PRE-FORMATTED STRINGS in a facts object: grossDelta, netDelta, retentionPct,
rentDelta, disposableDeltaMonthly, breakEvenSalary, fromCity, toCity, unmodelled[].
It returns 4 fields: headline (<=90 chars), body (2-3 sentences), breakEvenNote, caveat.
Style: plain language, no tax jargon, hedge every projection ("estimated", "roughly",
"under these assumptions"), never recommend a decision, no exclamation marks, no emoji.
Banned in the output — assert and strip: "you will", "guaranteed", "you should",
"best option", "I recommend", and any € figure not present in the facts object.
Cache the demo case's output. Target quality, for the Munich case:
  "€18,000 more on paper is €396 a month in your pocket."
  "About 53% of the raise survives income tax and social contributions — roughly €9,556 a
   year. Munich rent takes another €4,800 of that..."

=== TASK 7 — future-search-agent.ts ===
Two small jobs only:
  (a) optional: turn free-text constraints ("anywhere in the south, min 70k") into a search
      config object, Zod-validated, falling back to the UI's slider values.
  (b) label the 3 winners: given {city, salary, sideIncome, rent, disposableDelta} already
      computed, return {title (<=3 words), rationale (<=15 words)} for each. It may not
      output any figure not supplied to it.

=== TASK 8 — DemoControls.tsx, hidden panel, makes the live demo survivable ===
Toggle with the ` key. Global shortcuts, always active:
  Alt+1 reset to Alex / home          Alt+2 focus the prompt box
  Alt+3 run the pre-cached Munich scenario (no network, instant)
  Alt+4 jump to the reveal            Alt+5 run the future search
  Alt+6 fire the "raise" life event   Alt+0 hard reset
Panel shows: current view, whether ?offline=1 is on, and llmStatus (source + latency).
During the pitch I need to know at a glance whether we're live or cached.
Style it as minimal fixed-position chrome — the mobile pair owns all product UI, not me.

=== TASK 9 — deploy to Vercel at the halfway mark, not at the end ===
Confirm the URL works on a real phone, and confirm ?offline=1 works too.

Do tasks 1 and 2 first and push immediately. Then 3, 4, 5. Then test the demo sentence
three ways: online, network throttled, and ?offline=1. All three must return a valid Scenario.
```

---

---

## THE CONTRACT — send this to the mobile pair in the first 5 minutes

> You two own every pixel. We own every number. This is the entire seam between us —
> you never import from `src/simulation/` or `src/agents/` directly, you read the store.

```
STATE (src/store.ts, Zustand — ready in the first 15 min)
  profile          UserProfile
  baseResult       SimulationResult          <- current life
  scenarioResult   SimulationResult | null   <- the alternative
  searchState      {status, evaluated, results}
  lastDelta        {projectionYear, before, after, drivers[]}
  view             "home" | "compare" | "search" | "changed"
  llmStatus        {source, latencyMs}
  actions          setProfile, setScenario, setView, runSearch, fireEvent, reset

EVERY SimulationResult gives you:
  annualGrossIncome, socialContributions, incomeTax, soli, annualNetIncome,
  annualHousing, annualExpenses, annualDisposableIncome,
  projection: {year, savings}[],
  breakdown: {label, amount, certainty: "known"|"estimated"|"assumed"}[],
  assumptions: string[],
  confidence: 0..1

FORMATTING — use these, never toFixed():
  eur(n) eurMonth(n) eurRounded(n) delta(n) pct(n)   from src/lib/format.ts

SCREENS YOU OWN, in demo order:
  1. home      hero = eurMonth(baseResult.annualNetIncome/12), projections for 2028 + 2030
  2. prompt    one big input, 4 suggestion chips, Enter submits -> POST /api/scenario/parse
  3. compare   two futures + the big reveal line + "View assumptions" disclosure
  4. search    constraint sheet -> live counter -> branch animation -> 3 cards
  5. changed   "YOUR FUTURE CHANGED", 2030 number animating old -> new, driver breakdown
  Plus FutureGraph (Recharts, 2026-2030) embedded in home, compare and changed.

BUILD IT AT 390px. Phone frame, centered, device bezel on desktop. It deploys to a URL and
opens on a real phone — that's the demo.
  - The branch tree must grow TOP-DOWN and scroll. A tree that fans out sideways does not
    exist at 390px. This is the one layout decision that can break a whole beat.
  - The comparison can't be 7 rows x 3 columns at this width. Use a segmented toggle between
    the two futures, or stack the rows with the delta inline.
  - Chart: max 3 x-axis labels, eurRounded on y.

COPY RULES, non-negotiable, judges will notice:
  never "you will" -> "under these assumptions, roughly"
  never "move to Munich" -> "this scenario models best for disposable income"
  every result screen has a "View assumptions" affordance
  show the certainty label on values: Known / Estimated / Assumed
```

---

---

## FOR THE PITCH PERSON

Everything below is computed, verified against the 2026 German tax tables, and safe to
put on a slide.

```
Alex, 28, Berlin, software engineer, €72,000, €1,250 rent, €15,000 saved.

  Berlin €72k  -> net €43,776  - rent €15,000  = €28,776 disposable
  Munich €90k  -> net €53,332  - rent €19,800  = €33,532 disposable

  Gross difference        +€18,000
  Net difference           +€9,556      53% of the raise survives
  Disposable difference    +€4,756      = +€396 / month
  Break-even Munich salary  ~€80,800

THE LINE:   "€18,000 more on paper is €396 a month in your pocket."
THE CLOSER: "Your taxes are backward-looking. Your life isn't."
```

Two things to have ready for Q&A, because they will come up:

**"Isn't this just ChatGPT with a nice UI?"**
> The model never touches the arithmetic. It reads your sentence and writes the explanation.
> Between those two steps sits a deterministic German tax engine and a search that runs two
> thousand simulations in under half a second. That's why the number is the same every time.

**"Moving cities doesn't change your German tax."**
> Correct — and we don't claim it does. Germany has no municipal income tax. What changes is
> rent and cost of living, and what the simulator exposes is that a raise is worth about half
> its headline number once progressive tax and social contributions land. That gap is the
> product.

---

## PIN THIS

```
T+30   A says golden tests green. If not, B stops and helps.
T+15   B has store.ts and format.ts pushed. Mobile pair is blocked until then.
T+60   Can the mobile pair click home -> prompt -> compare with REAL numbers? If not,
       cut the future search now and put everything into the reveal + future changed.
T+85   B deploys. Test on an actual phone.
T+95   HANDS OFF KEYBOARDS. Rehearsal only.
T+120  Pitch.

Cut order: search animation polish -> search entirely -> comparison polish.
NEVER cut: the €396 reveal, or "your future changed".
```
