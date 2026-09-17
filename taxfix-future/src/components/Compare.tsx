"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useStore } from "@/store";
import { FutureGraph } from "./FutureGraph";
import { AnimatedNumber } from "./AnimatedNumber";
import { delta as fmtDelta, eur } from "@/lib/format";
import { SparkArrowIcon } from "./icons";

export function Compare() {
  const { profile, baseResult, scenario, scenarioResult, setScenario, fireEvents } = useStore();
  const [showAssumptions, setShowAssumptions] = useState(false);

  if (!scenario || !scenarioResult) return null;

  const baseLast = baseResult.projection[baseResult.projection.length - 1];
  const scenarioLast = scenarioResult.projection[scenarioResult.projection.length - 1];
  const diff = scenarioLast.savings - baseLast.savings;
  const positive = diff >= 0;

  const rows = [
    { label: "Net income / yr", base: baseResult.annualNetIncome, scenario: scenarioResult.annualNetIncome },
    {
      label: "Disposable / yr",
      base: baseResult.annualDisposableIncome,
      scenario: scenarioResult.annualDisposableIncome,
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-1 flex-col gap-5 px-5 pt-7 pb-6"
    >
      <button
        onClick={() => setScenario(null)}
        className="w-fit text-sm text-[var(--foreground-muted)]"
      >
        ← Back
      </button>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--foreground-muted)]">
          {scenario.name}
        </p>
        <h2 className="font-display text-3xl font-extrabold leading-tight tracking-tight">
          {scenario.changes.city && scenario.changes.city !== profile.city
            ? `${profile.city} vs ${scenario.changes.city}`
            : "This scenario vs today"}
        </h2>
      </div>

      <div className="relative overflow-hidden rounded-[var(--radius-lg)] bg-[var(--brand-dark)] p-5 text-white">
        <div
          className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full opacity-40 blur-3xl"
          style={{ background: `radial-gradient(circle, ${positive ? "var(--brand)" : "#e88b8b"} 0%, transparent 70%)` }}
        />
        <div className="relative">
          <FutureGraph baseline={baseResult.projection} scenario={scenarioResult.projection} height={160} />
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.25, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="mt-4 flex items-center justify-between rounded-[var(--radius-lg)] px-4 py-3"
            style={{ background: positive ? "rgba(173,238,104,0.15)" : "rgba(232,139,139,0.15)" }}
          >
            <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-white/70">
              <SparkArrowIcon className="h-3.5 w-3.5" /> in 5 years
            </span>
            <AnimatedNumber
              value={diff}
              format={fmtDelta}
              className="font-display text-2xl font-extrabold"
              style={{ color: positive ? "var(--brand)" : "#f3a9a9" }}
            />
          </motion.div>
        </div>
      </div>

      <div className="rounded-[var(--radius-lg)] border border-black/5 bg-white p-4">
        <div className="flex text-[11px] font-semibold uppercase tracking-wide text-[var(--foreground-muted)]">
          <span className="flex-1">Today</span>
          <span className="flex-1 text-right">This scenario</span>
        </div>
        <div className="mt-2 flex flex-col gap-3">
          {rows.map((r) => (
            <div key={r.label}>
              <div className="flex items-baseline justify-between">
                <span className="font-display text-base font-bold text-[var(--foreground-muted)]">
                  {eur(r.base)}
                </span>
                <span className="font-display text-base font-bold text-[var(--brand-dark)]">
                  {eur(r.scenario)}
                </span>
              </div>
              <p className="text-center text-[11px] text-[var(--foreground-muted)]">{r.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div>
        <button
          onClick={() => setShowAssumptions((v) => !v)}
          className="text-sm font-medium text-[var(--brand-dark)] underline underline-offset-2"
        >
          {showAssumptions ? "Hide" : "View"} assumptions
        </button>
        {showAssumptions && (
          <motion.ul
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="mt-2 flex flex-col gap-1.5 overflow-hidden"
          >
            {scenarioResult.assumptions.map((a) => (
              <li key={a} className="flex gap-2 text-xs text-[var(--foreground-muted)]">
                <span className="text-[var(--brand-dark)]">·</span>
                {a}
              </li>
            ))}
          </motion.ul>
        )}
      </div>

      <button
        onClick={() => fireEvents(["raise", "commuter", "writeoff"])}
        className="mt-auto flex items-center justify-center gap-2 rounded-[var(--radius-lg)] bg-[var(--brand)] px-5 py-4 text-center font-display text-lg font-extrabold text-[var(--brand-ink)] shadow-[0_10px_30px_-12px_rgba(173,238,104,0.7)] transition active:scale-[0.98]"
      >
        See what changed
      </button>
    </motion.div>
  );
}
