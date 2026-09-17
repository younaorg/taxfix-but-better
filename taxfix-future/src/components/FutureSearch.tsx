"use client";

import { useStore } from "@/store";
import { BranchCanvas } from "./BranchCanvas";
import { ScenarioCard } from "./ScenarioCard";
import { BigNumber, GhostButton } from "./ui";

export function FutureSearch() {
  const searchState = useStore((s) => s.searchState);
  const baseResult = useStore((s) => s.baseResult);
  const setScenario = useStore((s) => s.setScenario);
  const setView = useStore((s) => s.setView);

  return (
    <div className="flex flex-col gap-6 px-5 pb-10 pt-8">
      <button
        onClick={() => setView("home")}
        className="w-fit text-xs font-medium text-muted hover:text-foreground"
      >
        ‹ Home
      </button>

      <div>
        <div className="text-xs font-medium uppercase tracking-wide text-muted">
          {searchState.status === "done" ? "Futures explored" : "Exploring futures…"}
        </div>
        <BigNumber size="lg" className="mt-1 tabular-nums">
          {searchState.evaluated.toLocaleString("en-US")}
        </BigNumber>
      </div>

      <BranchCanvas evaluated={searchState.evaluated} />

      {searchState.status === "done" && (
        <div className="flex flex-col gap-3">
          <div className="text-xs font-medium uppercase tracking-wide text-muted">
            Three futures worth comparing
          </div>
          {searchState.results.map((r, i) => (
            <button
              key={`${r.city}-${r.grossSalary}-${i}`}
              onClick={() =>
                setScenario({
                  id: `search-${i}`,
                  name: r.title ?? r.city,
                  changes: {
                    city: r.city,
                    grossSalary: r.grossSalary,
                    monthlyRent: r.monthlyRent,
                    sideIncome: r.sideIncome,
                    workingHoursPct: r.workingHoursPct,
                  },
                  inferred: [],
                  missing: [],
                  confidence: "high",
                })
              }
              className="text-left"
            >
              <ScenarioCard ranked={r} baseDisposable={baseResult.annualDisposableIncome} index={i} />
            </button>
          ))}
          <GhostButton onClick={() => setView("home")} className="mt-2 text-center">
            Back to today
          </GhostButton>
        </div>
      )}
    </div>
  );
}
