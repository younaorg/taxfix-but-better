"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useStore } from "@/store";
import { defaultSearchConfig, findBestWriteOffInsight, runSearch, selectThree, WriteOffInsight } from "@/simulation/search";
import { Ranked } from "@/types/simulation";
import { writeOffHeadline } from "@/agents/future-search-agent";
import { eur } from "@/lib/format";
import { AnimatedNumber } from "./AnimatedNumber";

type Phase = "scanning" | "result";

export function Search() {
  const { profile, setView } = useStore();
  const [phase, setPhase] = useState<Phase>("scanning");
  const [count, setCount] = useState(0);
  const [insight, setInsight] = useState<WriteOffInsight | null>(null);
  const [alternates, setAlternates] = useState<Ranked[]>([]);
  const [showAlternates, setShowAlternates] = useState(false);

  useEffect(() => {
    const config = defaultSearchConfig(profile);
    const { all, evaluated } = runSearch(profile, config, (n) => setCount(n));
    setCount(evaluated);

    const bestInsight = findBestWriteOffInsight(profile);
    const three = selectThree(all, profile);

    const timer = setTimeout(() => {
      setInsight(bestInsight);
      setAlternates(three);
      setPhase("result");
    }, 900);
    return () => clearTimeout(timer);
  }, [profile]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-1 flex-col gap-5 px-5 pt-7 pb-6"
    >
      <button
        onClick={() => setView("home")}
        className="w-fit text-sm text-[var(--foreground-muted)]"
      >
        ← Back
      </button>

      {phase === "scanning" ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1.1, ease: "linear" }}
            className="h-10 w-10 rounded-full border-4 border-[var(--surface-tint)] border-t-[var(--brand-dark)]"
          />
          <p className="font-display text-2xl font-extrabold">
            Simulating {count.toLocaleString("en-US")} life trajectories…
          </p>
          <p className="text-sm text-[var(--foreground-muted)]">
            Exhaustive grid search, not AI — every combination actually computed.
          </p>
        </div>
      ) : (
        insight && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-1 flex-col gap-5"
          >
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--brand-dark)]">
                1 high-impact move found
              </p>
              <h2 className="mt-2 font-display text-[28px] font-extrabold leading-[1.05] tracking-tight">
                {writeOffHeadline(insight)}
              </h2>
            </div>

            <div className="rounded-[var(--radius-lg)] bg-[var(--brand)] p-5">
              <p className="text-xs uppercase tracking-wide text-[var(--brand-ink)]/70">
                Tax saved by claiming it this year
              </p>
              <AnimatedNumber
                value={insight.taxSaved}
                format={eur}
                className="font-display text-4xl font-extrabold text-[var(--brand-ink)]"
              />
              <p className="mt-1 text-sm text-[var(--brand-ink)]/80">
                ≈ {insight.effectiveRatePct}% of the purchase, back via your marginal tax rate.
              </p>
            </div>

            <button
              onClick={() => setShowAlternates((v) => !v)}
              className="text-sm font-medium text-[var(--brand-dark)] underline underline-offset-2"
            >
              {showAlternates ? "Hide" : "See"} {alternates.length} other timelines worth comparing
            </button>

            {showAlternates && (
              <div className="flex flex-col gap-2">
                {alternates.map((a) => (
                  <div
                    key={`${a.city}-${a.grossSalary}-${a.monthlyRent}`}
                    className="rounded-[var(--radius-lg)] border border-black/5 bg-white p-4"
                  >
                    <p className="font-display text-lg font-bold">
                      {a.city} · €{Math.round(a.grossSalary / 1000)}k
                    </p>
                    <p className="text-xs text-[var(--foreground-muted)]">
                      Rent €{a.monthlyRent}/mo · disposable {eur(a.result.annualDisposableIncome)}/yr
                    </p>
                  </div>
                ))}
              </div>
            )}

            <p className="mt-auto text-center text-[11px] leading-tight text-[var(--foreground-muted)]">
              Not the objectively best life — futures worth exploring. Illustrative estimates, not
              tax advice.
            </p>
          </motion.div>
        )
      )}
    </motion.div>
  );
}
