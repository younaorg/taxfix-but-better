"use client";

import { motion } from "framer-motion";
import { useStore } from "@/store";
import { AnimatedNumber } from "./AnimatedNumber";
import { delta as fmtDelta, eur } from "@/lib/format";
import { driverIcon, SparkArrowIcon } from "./icons";

export function Changed() {
  const { lastDelta, setView } = useStore();
  if (!lastDelta) return null;

  const boost = lastDelta.after - lastDelta.before;

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

      <p className="font-display text-sm font-bold uppercase tracking-wide text-[var(--brand-dark)]">
        Your future changed
      </p>

      <div className="relative overflow-hidden rounded-[var(--radius-lg)] bg-[var(--brand-dark)] p-5 text-white">
        <div
          className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full opacity-40 blur-3xl"
          style={{ background: "radial-gradient(circle, var(--brand) 0%, transparent 70%)" }}
        />
        <div className="relative flex items-baseline justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-white/50">Last projection</p>
            <p className="font-display text-xl font-bold text-white/60 line-through decoration-white/30">
              {eur(lastDelta.before)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-wide text-white/50">Now</p>
            <AnimatedNumber
              value={lastDelta.after}
              format={eur}
              className="font-display text-3xl font-extrabold text-[var(--brand)]"
            />
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="relative mt-4 flex items-center justify-center gap-2 rounded-[var(--radius-lg)] bg-[var(--brand)] py-3"
        >
          <SparkArrowIcon className="h-5 w-5 text-[var(--brand-ink)]" />
          <AnimatedNumber
            value={boost}
            format={fmtDelta}
            className="font-display text-xl font-extrabold text-[var(--brand-ink)]"
          />
          <span className="text-sm font-semibold text-[var(--brand-ink)]/80">projected boost</span>
        </motion.div>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--foreground-muted)]">
          Why
        </p>
        <div className="flex flex-col gap-2">
          {lastDelta.drivers.map((d, i) => {
            const Icon = driverIcon(d.label);
            const positive = d.amount >= 0;
            return (
              <motion.div
                key={d.label}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.45 + i * 0.1, duration: 0.3 }}
                className="flex items-center gap-3 rounded-[var(--radius-lg)] border border-black/5 bg-white px-4 py-3 shadow-[0_1px_0_rgba(0,0,0,0.03)]"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--surface-tint)] text-[var(--brand-ink)]">
                  <Icon />
                </span>
                <span className="flex-1 text-sm font-medium">{d.label}</span>
                <span
                  className="font-display text-base font-bold"
                  style={{ color: positive ? "var(--brand-ink)" : "var(--danger)" }}
                >
                  {fmtDelta(d.amount)}
                </span>
              </motion.div>
            );
          })}
        </div>
      </div>

      <p className="mt-auto text-center text-[11px] leading-tight text-[var(--foreground-muted)]">
        You're not opening this to do paperwork — you're opening it to see why your future moved.
      </p>
    </motion.div>
  );
}
