import { create } from "zustand";
import { UserProfile } from "@/types/profile";
import { Scenario } from "@/types/scenario";
import { SimulationResult, FutureDelta, Ranked } from "@/types/simulation";
import { simulate } from "@/simulation/simulate";
import { ALEX } from "@/data/demo-profile";
import { applyEvents } from "@/lib/events";

export type View = "home" | "compare" | "search" | "changed";

interface SearchState {
  status: "idle" | "running" | "done";
  evaluated: number;
  results: Ranked[];
}

interface LlmStatus {
  source: "llm" | "cache" | "fallback" | null;
  latencyMs: number | null;
}

interface Store {
  profile: UserProfile;
  scenario: Scenario | null;
  baseResult: SimulationResult;
  scenarioResult: SimulationResult | null;
  searchState: SearchState;
  lastDelta: FutureDelta | null;
  view: View;
  llmStatus: LlmStatus;

  setProfile: (patch: Partial<UserProfile>) => void;
  setScenario: (s: Scenario | null) => void;
  setView: (v: View) => void;
  setSearchState: (s: Partial<SearchState>) => void;
  setLlmStatus: (s: LlmStatus) => void;
  fireEvents: (ids: string[]) => void;
  reset: () => void;
}

function loadProfile(): UserProfile {
  if (typeof window === "undefined") return ALEX;
  try {
    const raw = window.localStorage.getItem("taxfix-future:profile");
    return raw ? { ...ALEX, ...JSON.parse(raw) } : ALEX;
  } catch {
    return ALEX;
  }
}

function persistProfile(profile: UserProfile) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem("taxfix-future:profile", JSON.stringify(profile));
  } catch {
    // localStorage unavailable — non-fatal, demo continues without persistence.
  }
}

const initialProfile = loadProfile();

export const useStore = create<Store>((set, get) => ({
  profile: initialProfile,
  scenario: null,
  baseResult: simulate(initialProfile),
  scenarioResult: null,
  searchState: { status: "idle", evaluated: 0, results: [] },
  lastDelta: null,
  view: "home",
  llmStatus: { source: null, latencyMs: null },

  setProfile: (patch) => {
    const profile = { ...get().profile, ...patch };
    persistProfile(profile);
    set({ profile, baseResult: simulate(profile) });
  },

  setScenario: (scenario) => {
    const { profile } = get();
    set({
      scenario,
      scenarioResult: scenario ? simulate(profile, scenario.changes) : null,
      view: scenario ? "compare" : get().view,
    });
  },

  setView: (view) => set({ view }),
  setSearchState: (patch) => set({ searchState: { ...get().searchState, ...patch } }),
  setLlmStatus: (llmStatus) => set({ llmStatus }),

  fireEvents: (ids) => {
    const { profile } = get();
    const { delta } = applyEvents(profile, ids);
    set({ lastDelta: delta, view: "changed" });
  },

  reset: () => {
    persistProfile(ALEX);
    set({
      profile: ALEX,
      scenario: null,
      baseResult: simulate(ALEX),
      scenarioResult: null,
      searchState: { status: "idle", evaluated: 0, results: [] },
      lastDelta: null,
      view: "home",
      llmStatus: { source: null, latencyMs: null },
    });
  },
}));
