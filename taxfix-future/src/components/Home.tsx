"use client";

import { motion } from "framer-motion";
import { useStore } from "@/store";
import { FutureGraph } from "./FutureGraph";
import { AnimatedNumber } from "./AnimatedNumber";
import { LifePrompt } from "./LifePrompt";
import { getCachedScenario, DEMO_PROMPT } from "@/data/prompt-cache";

const SUGGESTIONS = [
  { label: "Move to Munich for €90k", prompt: DEMO_PROMPT },
  { label: "Ask for a €10k raise", prompt: "should I ask for a 10k raise" },
  { label: "Freelance on the side", prompt: "what if I freelance on the side for 500 a month" },
];

export function Home() {
  const { profile, baseResult, setScenario, setView } = useStore();
  const first = baseResult.projection[0];
  const last = baseResult.projection[baseResult.projection.length - 1];

  function handleSuggestion(prompt: string) {
    const cached = getCachedScenario(prompt);
    if (cached) {
      setScenario(cached);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-1 flex-col gap-6 px-5 pt-7 pb-6"
    >
      <div className="flex items-center justify-between">
        <span className="font-display text-sm font-bold tracking-wide text-[var(--brand-dark)]">
          TAXFIX FUTURE
        </span>
        <button
          onClick={() => useStore.getState().reset()}
          className="text-xs text-[var(--foreground-muted)] underline underline-offset-2"
        >
          Reset
        </button>
      </div>

      <div>
        <h1 className="font-display text-[44px] font-extrabold leading-[0.95] tracking-tight text-[var(--foreground)]">
          Your Life,
          <br />
          Simulated.
        </h1>
        <p className="mt-3 text-[15px] text-[var(--foreground-muted)]">
          {profile.name}, {profile.age} — {profile.city}. Not an annual panic button. A model
          that moves when your life does.
        </p>
      </div>

      <div className="rounded-[var(--radius-lg)] bg-[var(--brand-dark)] p-5 text-white">
        <div className="flex items-baseline justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-white/60">Net worth, now</p>
            <AnimatedNumber
              value={first.savings}
              className="font-display text-2xl font-bold"
            />
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-wide text-white/60">In 5 years</p>
            <AnimatedNumber
              value={last.savings}
              className="font-display text-2xl font-bold text-[var(--brand)]"
            />
          </div>
        </div>
        <div className="mt-4">
          <FutureGraph baseline={baseResult.projection} height={140} />
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--foreground-muted)]">
          Ask about anything that could change
        </p>
        <LifePrompt />
        <div className="mt-3 flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s.label}
              onClick={() => handleSuggestion(s.prompt)}
              className="rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs font-medium text-[var(--foreground)] transition active:scale-[0.97] active:bg-[var(--surface-tint)]"
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={() => setView("search")}
        className="mt-auto rounded-[var(--radius-lg)] bg-[var(--brand)] px-5 py-4 text-center font-display text-lg font-extrabold text-[var(--brand-ink)] shadow-[0_10px_30px_-12px_rgba(173,238,104,0.7)] transition active:scale-[0.98]"
      >
        Find me a better timeline
      </button>

      <p className="text-center text-[11px] leading-tight text-[var(--foreground-muted)]">
        Illustrative estimates, not tax advice.
      </p>
    </motion.div>
  );
}
