"use client";

import { useStore } from "@/store";
import { eur, eurMonth, delta } from "@/lib/format";
import { Assumptions, BigNumber, Card, PrimaryButton } from "./ui";
import { FutureGraph } from "./FutureGraph";

const ROWS: { label: string; key: "annualGrossIncome" | "annualNetIncome" | "annualHousing" | "annualDisposableIncome" }[] = [
  { label: "Gross income", key: "annualGrossIncome" },
  { label: "Net income", key: "annualNetIncome" },
  { label: "Housing", key: "annualHousing" },
  { label: "Disposable income", key: "annualDisposableIncome" },
];

export function Comparison() {
  const scenario = useStore((s) => s.scenario);
  const baseResult = useStore((s) => s.baseResult);
  const scenarioResult = useStore((s) => s.scenarioResult);
  const explanation = useStore((s) => s.explanation);
  const breakEven = useStore((s) => s.breakEven);
  const setScenario = useStore((s) => s.setScenario);
  const runSearch = useStore((s) => s.runSearch);

  if (!scenario || !scenarioResult) return null;

  const diffAnnual = scenarioResult.annualDisposableIncome - baseResult.annualDisposableIncome;
  const diffMonthly = diffAnnual / 12;

  return (
    <div className="flex flex-col gap-6 px-5 pb-10 pt-8">
      <button
        onClick={() => setScenario(null)}
        className="w-fit text-xs font-medium text-muted hover:text-foreground"
      >
        ‹ Home
      </button>

      <div>
        <div className="text-xs font-medium uppercase tracking-wide text-muted">
          {baseResult.label} vs {scenarioResult.label}
        </div>
        <BigNumber size="xl" className="mt-1 text-accent-strong">
          {delta(diffMonthly)}
          <span className="text-2xl text-muted">/mo</span>
        </BigNumber>
        <p className="mt-3 min-h-[3.5rem] text-sm leading-relaxed text-foreground/90">
          {explanation?.headline ?? (
            <span className="inline-block animate-[pulse-soft_1.4s_ease-in-out_infinite] text-muted">
              Working out what this means…
            </span>
          )}
        </p>
        {explanation && (
          <p className="mt-2 text-xs leading-relaxed text-muted">{explanation.body}</p>
        )}
      </div>

      <Card>
        <FutureGraph base={baseResult.projection} scenario={scenarioResult.projection} height={140} />
      </Card>

      <Card className="flex flex-col gap-3">
        {ROWS.map((row) => {
          const base = baseResult[row.key];
          const alt = scenarioResult[row.key];
          const d = alt - base;
          return (
            <div key={row.key} className="flex items-center justify-between text-sm">
              <span className="text-muted">{row.label}</span>
              <span className="flex items-baseline gap-2 tabular-nums">
                <span className="text-foreground">{eur(alt)}</span>
                {d !== 0 && (
                  <span className={d > 0 ? "text-accent-strong text-xs" : "text-xs text-muted"}>
                    {delta(d)}
                  </span>
                )}
              </span>
            </div>
          );
        })}
      </Card>

      {breakEven !== null && (
        <Card>
          <div className="text-xs font-medium uppercase tracking-wide text-muted">
            Break-even offer
          </div>
          <BigNumber size="md" className="mt-1">
            {eur(breakEven)}
          </BigNumber>
          <p className="mt-2 text-xs leading-relaxed text-muted">
            {explanation?.breakEvenNote ??
              `Roughly what ${scenarioResult.label} would need to pay to match ${baseResult.label} on disposable income.`}
          </p>
        </Card>
      )}

      <Assumptions
        items={[...new Set([...baseResult.assumptions, ...scenarioResult.assumptions])]}
      />
      {explanation?.caveat && (
        <p className="-mt-3 text-xs text-muted">{explanation.caveat}</p>
      )}

      <PrimaryButton onClick={() => runSearch()}>Find me a better future</PrimaryButton>
    </div>
  );
}
