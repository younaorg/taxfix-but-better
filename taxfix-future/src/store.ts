"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { ALEX_PROFILE } from "@/data/demo-profile";
import { DEMO_EXPLANATION, DEMO_SCENARIO } from "@/data/prompt-cache";
import { applyEvent } from "@/lib/events";
import { delta } from "@/lib/format";
import {
  DEFAULT_SEARCH_CONFIG,
  labelFutures,
} from "@/agents/future-search-agent";
import { explain } from "@/agents/explanation-agent";
import { runSearch as runGrid, selectThree } from "@/simulation/search";
import { breakEvenSalary, simulate } from "@/simulation/simulate";
import type { UserProfile } from "@/types/profile";
import type { Scenario } from "@/types/scenario";
import type {
  AppView,
  Explanation,
  FutureDelta,
  LlmStatus,
  Ranked,
  SearchConfig,
  SimulationResult,
} from "@/types/simulation";

export interface SearchState {
  status: "idle" | "running" | "done";
  evaluated: number;
  results: Ranked[];
}

interface TwinStore {
  profile: UserProfile;
  scenario: Scenario | null;
  baseResult: SimulationResult;
  scenarioResult: SimulationResult | null;
  explanation: Explanation | null;
  breakEven: number | null;
  searchState: SearchState;
  lastDelta: FutureDelta | null;
  view: AppView;
  llmStatus: LlmStatus;
  setProfile: (patch: Partial<UserProfile>) => void;
  setScenario: (s: Scenario | null) => void;
  setView: (v: AppView) => void;
  setLlmStatus: (s: LlmStatus) => void;
  runSearch: (config?: SearchConfig) => Promise<void>;
  fireEvent: (id: string) => void;
  reset: () => void;
}

function derive(profile: UserProfile, scenario: Scenario | null) {
  const baseResult = simulate(profile);
  const scenarioResult = scenario
    ? simulate(profile, scenario.changes)
    : null;
  const breakEven = scenario
    ? breakEvenSalary(profile, scenario.changes)
    : null;
  return { baseResult, scenarioResult, breakEven };
}

export const useStore = create<TwinStore>()(
  persist(
    (set, get) => ({
      profile: ALEX_PROFILE,
      scenario: null,
      ...derive(ALEX_PROFILE, null),
      explanation: null,
      searchState: { status: "idle", evaluated: 0, results: [] },
      lastDelta: null,
      view: "home",
      llmStatus: { source: null, latencyMs: null },
      setProfile: (patch) => {
        const profile = { ...get().profile, ...patch };
        set({ profile, ...derive(profile, get().scenario) });
      },
      setScenario: (scenario) => {
        const derived = derive(get().profile, scenario);
        set({ scenario, ...derived, view: scenario ? "compare" : "home" });
        if (
          scenario?.changes.city === "Munich" &&
          scenario.changes.grossSalary === 90_000
        ) {
          set({ explanation: DEMO_EXPLANATION });
          return;
        }
        if (!scenario || !derived.scenarioResult) {
          set({ explanation: null });
          return;
        }
        const base = derived.baseResult;
        const alt = derived.scenarioResult;
        void explain({
          grossDelta: delta(alt.annualGrossIncome - base.annualGrossIncome),
          netDelta: delta(alt.annualNetIncome - base.annualNetIncome),
          retentionPct:
            alt.annualGrossIncome === base.annualGrossIncome
              ? "0%"
              : `${Math.round(
                  ((alt.annualNetIncome - base.annualNetIncome) /
                    (alt.annualGrossIncome - base.annualGrossIncome)) *
                    100,
                )}%`,
          rentDelta: delta(alt.annualHousing - base.annualHousing) + "/year",
          disposableDelta:
            delta(alt.annualDisposableIncome - base.annualDisposableIncome) +
            "/year",
          disposableDeltaMonthly:
            delta(
              Math.round(
                (alt.annualDisposableIncome - base.annualDisposableIncome) / 12,
              ),
            ) + "/month",
          breakEvenSalary: `€${(derived.breakEven ?? 0).toLocaleString("en-US")}`,
          fromCity: get().profile.city,
          toCity: scenario.changes.city ?? get().profile.city,
          unmodelled: ["moving costs", "commute", "church tax"],
        }).then((explanation) => set({ explanation }));
      },
      setView: (view) => set({ view }),
      setLlmStatus: (llmStatus) => set({ llmStatus }),
      runSearch: async (config = DEFAULT_SEARCH_CONFIG) => {
        set({
          searchState: { status: "running", evaluated: 0, results: [] },
          view: "search",
        });
        const { evaluated, all } = runGrid(get().profile, config, (n) => {
          set({
            searchState: { ...get().searchState, status: "running", evaluated: n },
          });
        });
        const results = selectThree(all, get().profile);
        const labels = await labelFutures(
          results,
          results.map((r) =>
            delta(
              r.result.annualDisposableIncome -
                get().baseResult.annualDisposableIncome,
            ),
          ),
        );
        set({
          searchState: {
            status: "done",
            evaluated,
            results: results.map((r, i) => ({
              ...r,
              title: labels[i]?.title,
              rationale: labels[i]?.rationale,
            })),
          },
        });
      },
      fireEvent: (id) => {
        const { before, after, delta: lastDelta } = applyEvent(get().profile, id);
        void before;
        const eventPatch =
          id === "raise"
            ? { grossSalary: 78_000 }
            : id === "rent"
              ? { monthlyRent: 1_420 }
              : id === "side"
                ? { sideIncome: 6_000 }
                : {};
        const profile = { ...get().profile, ...eventPatch };
        set({
          profile,
          lastDelta,
          view: "changed",
          ...derive(profile, get().scenario),
          baseResult: after,
        });
      },
      reset: () => {
        set({
          profile: ALEX_PROFILE,
          scenario: null,
          ...derive(ALEX_PROFILE, null),
          explanation: null,
          searchState: { status: "idle", evaluated: 0, results: [] },
          lastDelta: null,
          view: "home",
          llmStatus: { source: null, latencyMs: null },
        });
      },
    }),
    {
      name: "taxfix-twin",
      partialize: (s) => ({ profile: s.profile }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        const next = derive(state.profile, state.scenario);
        state.baseResult = next.baseResult;
        state.scenarioResult = next.scenarioResult;
        state.breakEven = next.breakEven;
      },
    },
  ),
);

export { DEMO_SCENARIO };
