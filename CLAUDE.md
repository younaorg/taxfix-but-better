# CLAUDE.md — Taxfix Future

Operating manual for this repo. Every coding agent and every human reads this **before** writing code.
Product-side AI agent specs live in `AGENTS.md`. Read this file first.

---

## 0. What we are building

A financial **digital twin** + **scenario simulator** that turns Taxfix from a once-a-year filing
tool into something people open whenever their life changes.

We are building it in **2 hours with 5 people**. That is ~10 person-hours. The README describes
37 sections; we are implementing roughly 6 of them. Everything in this file exists to stop us
from building the other 31.

---

## 1. The only thing that matters: the 150-second demo

If a change does not make one of these six beats better, **do not build it**.

| # | Beat | On screen | Owner |
|---|------|-----------|-------|
| 1 | Meet Alex | Berlin, €72k, €1,250 rent, €15k saved. Projection to 2030. | B |
| 2 | Type the question | "I got offered €90k in Munich, rent €1,650. Worth it?" | C |
| 3 | Two timelines | Side-by-side Berlin vs Munich, animated chart split | C + E |
| 4 | **The reveal** | +€18,000 gross = **+€396/month** in your pocket | C |
| 5 | **Find me a better timeline** | 1,847 futures animate, collapse to 3 | D |
| 6 | **Your future changed** | Salary event fires, 2030 projection re-animates | E |

Beat 6 is the one that answers the hackathon brief (*why do users come back?*). It is the
**last thing we cut**, not the first. If we are behind at T+90, cut beat 5 before beat 6.

**Demo runs on a laptop, in one browser tab, with no login, no DB, no backend deploy.**

---

## 2. Hard rules (non-negotiable)

1. **The LLM never does arithmetic.** Every number on screen comes from `src/simulation/`.
   The LLM only (a) turns language into a `Scenario` object and (b) turns numbers into prose.
   If you catch a model producing a euro amount, that is a bug.
2. **No `€XX,XXX` placeholders anywhere.** The README uses them; the product must not.
   A number we cannot compute is a number we do not display.
3. **Never state a projection as fact.** Copy rules in §7.
4. **No new npm dependencies after T+30** without shouting in the group chat first.
   Pre-approved list in §5. Everything else: write 20 lines yourself.
5. **Stay in your lane's files** (§4). If you need something from another lane, mock it behind
   the interface in `src/types/` and keep moving. Do not edit another lane's file to unblock
   yourself — message the owner.
6. **Blocked for 5 minutes → fake that piece and move on.** Write `// FAKED:` above it.
   At T+100 we grep for `FAKED:` and decide what survives.
7. **Commit every 10 minutes.** Small commits, straight to `main`, no PRs, no reviews.
   `git pull --rebase` before every push.
8. **Nothing in the demo path may require a network call we cannot retry.** See §8.

---

## 3. Facts the concept gets wrong — fix these in the product

Read this section carefully, it changes the demo copy.

### 3.1 Moving cities does **not** change your German income tax
Germany has no municipal income tax. Berlin → Munich changes **rent and cost of living**, not
Einkommensteuer. The only location-dependent tax is **church tax** (8% in Bayern & BW, 9%
elsewhere) and only if the user is a church member.

So do **not** say "your taxes change when you move." Say what is actually true, which is more
interesting anyway:

> Your €18,000 raise is worth €9,556 after tax and social contributions — **53% of it**.
> Munich's rent eats €4,800 of that. You keep **€396 a month**.

The hero insight is **progressive taxation + social contributions + cost of living**, not
geography-based tax. This is a better story and it is defensible in Q&A.

### 3.2 The break-even number is the sharpest thing we ship
For Alex: a Munich offer must be **~€80,800** to match Berlin at €72k on modelled disposable
income. One number, instantly useful, impossible to get from a tax calculator. Make it big.

### 3.3 "2,847 futures" is a grid search, not AI
That is fine — it demos beautifully. But do not claim it is an AI search in the pitch; claim it
is an **exhaustive** search, which is a stronger claim and true. The AI part is translating the
user's constraints into the search space and labelling the survivors.

---

## 4. Lane ownership — 5 people, zero merge conflicts

Each person owns files no one else touches. Shared contracts are frozen at T+10.

### Lane A — Simulation Engine (`sim`)
**Owns:** `src/simulation/*`, `src/data/*`, `tests/simulation.test.ts`
Pure TypeScript. No React, no imports from `src/app` or `src/components`.
Deliverable: `simulate(profile, scenario) => SimulationResult`, correct and fast (<1ms).
This lane is the credibility of the whole demo. Get §6 constants exactly right.

### Lane B — Shell, state & home (`shell`)
**Owns:** `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`,
`src/components/Profile*.tsx`, `src/store.ts`
Deliverable: the app shell, the design tokens, the Alex profile + an edit drawer,
the home screen of beat 1, and a single Zustand store everyone reads from.
B is the integrator. When two lanes disagree about UI, B decides.

### Lane C — Scenario parse & comparison (`scenario`)
**Owns:** `src/app/api/scenario/route.ts`, `src/agents/scenario-agent.ts`,
`src/agents/explanation-agent.ts`, `src/components/LifePrompt.tsx`,
`src/components/Comparison.tsx`, `src/components/BreakEven.tsx`
Deliverable: beats 2, 3, 4. The prompt box, the two-column diff, the reveal, break-even.

### Lane D — Future search (`futures`)
**Owns:** `src/agents/future-search-agent.ts`, `src/simulation/search.ts`,
`src/components/FutureSearch.tsx`, `src/components/BranchCanvas.tsx`,
`src/components/ScenarioCard.tsx`
Deliverable: beat 5. Constraint sheet → grid search → animated branches → 3 labelled futures.
Must run in the browser, off the main thread if it stutters. Target: 2,000+ scenarios <400ms.

### Lane E — Projection chart, "Future Changed" & demo control (`future`)
**Owns:** `src/components/FutureGraph.tsx`, `src/components/FutureChanged.tsx`,
`src/components/DemoControls.tsx`, `src/lib/events.ts`, deployment
Deliverable: beat 6 + the Recharts timeline everyone else embeds + a hidden demo control panel
(keyboard `⌥1..⌥6`) that fires each beat deterministically. E also owns the Vercel deploy and
is the person who runs the laptop during the pitch.

### Shared, frozen at T+10 (owner: B, edited only by agreement)
`src/types/profile.ts`, `src/types/scenario.ts`, `src/types/simulation.ts`

---

## 5. Stack & pre-approved dependencies

```
Next.js 15 (App Router) · TypeScript strict · Tailwind · Framer Motion · Recharts · Zustand · Zod
```

LLM calls go through `src/lib/llm.ts` (owner: C) using structured output / JSON schema mode.
Anything not on this list needs a shout before `npm i`.

No database. No auth. State lives in Zustand + `localStorage`. Profile is seeded from
`src/data/demo-profile.ts`.

---

## 6. Calibration table — the numbers must match

2026 German constants. These are verified; hardcode them in `src/simulation/constants.ts`.

```ts
// Einkommensteuer §32a EStG, tax year 2026
GRUNDFREIBETRAG = 12_348
// zone 2: 12_349–17_799   y = (zvE-12_348)/10_000 ; ESt = (914.51*y + 1_400)*y
// zone 3: 17_800–69_878   z = (zvE-17_799)/10_000 ; ESt = (173.10*z + 2_397)*z + 1_034.87
// zone 4: 69_879–277_825  ESt = 0.42*zvE - 11_135.63
// zone 5: 277_826+        ESt = 0.45*zvE - 19_470.38

// Social insurance 2026 — employee share
BBG_RV_AV = 101_400   // pension + unemployment, annual
BBG_KV_PV =  69_750   // health + long-term care, annual
RV = 0.186 / 2        // 9.30%
AV = 0.026 / 2        // 1.30%
KV = (0.146 + 0.029) / 2   // 8.75%  (incl. 2.9% avg Zusatzbeitrag)
PV_childless = 0.024  // 1.8% + 0.6% Kinderlosenzuschlag (age 23+)
PV_parent    = 0.018

// Solidaritätszuschlag: 5.5% of ESt, Freigrenze €20,350 ESt (single).
// Alex never crosses it in the demo. Model it, but expect 0.
WERBUNGSKOSTEN_PAUSCHBETRAG = 1_230
SONDERAUSGABEN_PAUSCHBETRAG = 36
```

**zvE approximation for the MVP** (state this in the assumptions drawer):
`zvE = gross − (RV + KV + PV employee shares) − 1,230 − 36`
(AV is not deductible; the real Vorsorgepauschale is more granular. Close enough, and labelled.)

**Golden test cases — `tests/simulation.test.ts` must reproduce these (±€50):**

| Gross | SV (employee) | zvE | ESt | Net | Net/month |
|---|---|---|---|---|---|
| €72,000 | €15,409 | €56,261 | €12,815 | **€43,776** | €3,648 |
| €78,000 | €16,045 | €61,703 | €14,895 | **€47,060** | €3,922 |
| €84,000 | €16,681 | €67,145 | €17,078 | **€50,241** | €4,187 |
| €90,000 | €17,317 | €72,587 | €19,351 | **€53,332** | €4,444 |
| €98,000 | €18,165 | €79,843 | €22,398 | **€57,436** | €4,786 |

*(single, no children, no church tax, tax class I)*

**Derived demo numbers — memorise these, they are the pitch:**

```
Berlin  €72k → net €43,776 − rent €15,000 = €28,776 disposable
Munich  €90k → net €53,332 − rent €19,800 = €33,532 disposable

Gross difference     +€18,000
Net difference        +€9,556   (53% of the raise)
Disposable difference +€4,756   →  +€396 / month
Break-even Munich salary        ≈ €80,800
```

If the app prints something materially different from this table, Lane A has a bug. Fix the
engine, do not fudge the copy.

---

## 7. Copy & tone rules

The product is a model, not an oracle. Every screen obeys these:

| Never write | Write instead |
|---|---|
| "You will have €120,482 in 2030." | "Under these assumptions, roughly €120k." |
| "Move to Munich." | "If disposable income is your priority, this scenario models best." |
| "Your taxes will be €19,351." | "Estimated income tax: €19,400." |
| "The best future for you" | "Three futures worth comparing" |

- Round anything projected more than 1 year out to the nearest €100.
- Every result panel has a **"View assumptions"** affordance. It is not optional; it is the
  reason judges will trust the demo.
- Label every value as **Known / Estimated / Assumed**. Lane A returns this per field.
- Visual language: large numbers, very little text, generous space, one accent colour.
  Not a banking dashboard. Not a tax form.

---

## 8. What we fake, what must be real

**Fake freely:** bank connections, document ingestion, transaction history, notifications,
auth, persistence, church tax, Kirchensteuer opt-in, freelance Gewerbesteuer, the "new salary
detected" event (it is a button in `DemoControls`).

**Must actually work:** scenario extraction from free text, the tax/net calculation, the
comparison, the grid search, the projection chart, the explanation text.

**Demo-safety (Lane C + E, due T+100):**
- Every LLM call has a **hard 4-second timeout** and a deterministic regex fallback parser
  (`parseScenarioFallback` in `AGENTS.md` §2.4). The demo must survive dead conference wifi.
- The exact demo prompt is **pre-cached** in `src/data/prompt-cache.ts`. Cache hit = 0ms.
- `?offline=1` disables all network calls and uses only the cache. Rehearse in this mode once.

---

## 9. The 120 minutes

Clock starts when everyone has the repo cloned and `npm run dev` working. **Do that before
the clock starts.** So does scaffolding: `create-next-app`, Tailwind, and the empty files from
§4 committed. If the scaffold eats hackathon time we lose 15% of the build.

| Time | A · sim | B · shell | C · scenario | D · futures | E · future |
|---|---|---|---|---|---|
| **0–10** | — | **Freeze `src/types/*` and push.** Everyone waits for this, then never blocks again. | — | — | — |
| **10–35** | §32a + SV engine, constants, golden tests green | Tokens, layout, Alex profile card, Zustand store | Prompt box UI + `/api/scenario` with hardcoded response | Grid search over a stub `simulate()` | Recharts projection curve on fake data |
| **35–60** | `projection()`, `SimulationResult` incl. confidence + assumption list | Home screen beat 1 wired to real `simulate()` | Real LLM parse + Zod validation + fallback parser | Branch animation (Framer Motion), 2k scenarios <400ms | `FutureChanged` full-screen transition + number roll-up |
| **60–75** | **Freeze engine.** Then: side-income & part-time support | Wire C, D, E components into `page.tsx` | Comparison table + break-even panel | Objective filtering → 3 distinct futures + labels | `DemoControls` panel, ⌥1..⌥6 hotkeys |
| **75–90** | Assumptions drawer content, confidence scoring | Polish: spacing, type scale, dark bg, transitions | Explanation agent + tone-rule pass | Card design + "1,847 futures explored" counter | Deploy to Vercel. Test on the actual demo machine. |
| **90–100** | **Integration freeze.** All five: stop building. Run the demo end to end, twice, together. Grep `FAKED:`. | | | | |
| **100–110** | Bug bash on the demo path only. Anything off the path stays broken. | | | | |
| **110–120** | E drives, one person narrates, full rehearsal ×2 with a stopwatch. Fix nothing that is not on screen. | | | | |

**Checkpoints — say these out loud:**
- **T+35:** golden tests green? types frozen? If no, A and B drop everything else.
- **T+60:** can we click through beats 1–4 with real numbers? If no, cut beat 5 now.
- **T+90:** hands off keyboards. Seriously.

---

## 10. Definition of done, per lane

- **A:** `npm test` green against the §6 table. `simulate()` returns assumptions + confidence.
- **B:** Beat 1 renders from the store with real engine output; nothing on screen is lorem.
- **C:** Typing the demo sentence produces the correct Scenario JSON, the comparison, and the
  €396/month reveal — and still works with wifi off.
- **D:** Button → animated search → counter → 3 materially different futures with real deltas.
- **E:** Hotkey fires the salary event, the 2030 number animates from old to new, deployed URL works.

---

## 11. Merge protocol

```bash
git pull --rebase && npm run build && git push
```
Straight to `main`. If `npm run build` fails, you fix it now — a broken `main` blocks four
other people. No PRs, no branches, no code review during the 2 hours.
Conflicts should be impossible if you stay in your lane's files. If you hit one, the file
owner's version wins; re-apply your change on top.

---

## 12. Instructions for coding agents

- Read this file and `AGENTS.md` before generating code. Do not restate the plan back; build.
- **Ask which lane you are in** if it is not in the prompt. Then only touch that lane's files.
- Generate complete files, not fragments. The humans are moving fast and will not merge diffs.
- TypeScript strict. No `any` on anything crossing a lane boundary.
- Do not invent tax logic. Use the constants in §6 verbatim. If a rule is missing, add it to the
  assumptions list instead of guessing.
- Do not add loading spinners to things that take 1ms. Add motion to things that matter.
- When you generate a number for copy or a comment, it must come from §6.
- Prefer one 200-line component over five 40-line ones. We are not maintaining this on Monday.

---

## 13. What we are explicitly not building

Onboarding flow · auth · database · `/replay` route · `/compare` route · share cards ·
document upload · bank connection · notifications · mobile layout · i18n · error boundaries ·
married/joint assessment (`Splittingtarif`) · children allowances (`Kinderfreibetrag`) ·
church tax · freelance/self-employment tax · investment returns.

Several of these are one-liners in the assumptions drawer. That is where they go.

---

## 14. The line we close with

> Your taxes are backward-looking. Your life isn't.
