"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useStore } from "@/store";

const AGENT_STEPS = [
  "Reading what you asked…",
  "Finding the real tax rules…",
  "Simulating your 5-year timeline…",
];

const MIN_THINKING_MS = 2_000;
const STEP_MS = 650;

const SOURCE_LABEL: Record<string, string> = {
  llm: "Parsed live",
  cache: "Parsed instantly",
  fallback: "Parsed offline",
};

export function LifePrompt() {
  const [text, setText] = useState("");
  const [status, setStatus] = useState<"idle" | "thinking">("idle");
  const [stepIndex, setStepIndex] = useState(0);
  const [hint, setHint] = useState<string | null>(null);
  const { profile, setScenario, setLlmStatus, llmStatus } = useStore();

  useEffect(() => {
    if (status !== "thinking") return;
    setStepIndex(0);
    const id = setInterval(() => {
      setStepIndex((i) => Math.min(i + 1, AGENT_STEPS.length - 1));
    }, STEP_MS);
    return () => clearInterval(id);
  }, [status]);

  async function submit() {
    const prompt = text.trim();
    if (!prompt || status === "thinking") return;
    setStatus("thinking");
    setHint(null);
    const started = performance.now();

    try {
      const res = await fetch("/api/scenario/parse", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ prompt, profile }),
      });
      const data = await res.json();

      // Real latency here is usually <10ms (cache/regex fallback) — hold the "agent
      // working" state for a minimum stretch so it reads as genuine simulation, not a trick.
      const elapsed = performance.now() - started;
      if (elapsed < MIN_THINKING_MS) {
        await new Promise((r) => setTimeout(r, MIN_THINKING_MS - elapsed));
      }

      setLlmStatus({ source: data.source ?? "fallback", latencyMs: data.latencyMs ?? null });
      const changeCount = data.scenario ? Object.keys(data.scenario.changes).length : 0;
      if (changeCount > 0) {
        setScenario(data.scenario);
        setText("");
      } else {
        setHint("Didn't catch a number there — try naming a city, salary, or amount.");
      }
    } catch {
      setHint("Couldn't reach the network — try again, or use a suggestion below.");
    } finally {
      setStatus("idle");
    }
  }

  return (
    <div>
      <div className="flex items-end gap-2 rounded-[var(--radius-lg)] border border-black/10 bg-white p-2 pl-4 shadow-[0_1px_0_rgba(0,0,0,0.04)] focus-within:border-[var(--brand-dark)]">
        <textarea
          id="life-prompt"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          disabled={status === "thinking"}
          placeholder="Ask anything — “what if I go part-time?”"
          rows={1}
          className="max-h-24 flex-1 resize-none bg-transparent py-2 text-sm text-[var(--foreground)] outline-none placeholder:text-[var(--foreground-muted)] disabled:opacity-60"
        />
        <button
          onClick={submit}
          disabled={status === "thinking" || !text.trim()}
          aria-label="Ask"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--brand-dark)] text-[var(--brand)] transition disabled:opacity-30"
        >
          {status === "thinking" ? (
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          ) : (
            "→"
          )}
        </button>
      </div>

      <AnimatePresence mode="wait">
        {status === "thinking" && (
          <motion.div
            key="thinking-panel"
            initial={{ opacity: 0, y: -4, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="mt-3 flex items-center gap-3 overflow-hidden rounded-[var(--radius-lg)] bg-[var(--surface-tint)] px-4 py-3"
          >
            <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-[var(--brand-dark)]/25 border-t-[var(--brand-dark)]" />
            <AnimatePresence mode="wait">
              <motion.span
                key={stepIndex}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.2 }}
                className="text-sm font-medium text-[var(--brand-ink)]"
              >
                {AGENT_STEPS[stepIndex]}
              </motion.span>
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {hint && status === "idle" && (
        <p className="mt-2 text-xs text-[var(--foreground-muted)]">{hint}</p>
      )}
      {llmStatus.source && !hint && status === "idle" && (
        <p className="mt-2 text-xs text-[var(--foreground-muted)]">
          {SOURCE_LABEL[llmStatus.source]}
          {llmStatus.latencyMs ? ` · ${Math.round(llmStatus.latencyMs)}ms` : ""}
        </p>
      )}
    </div>
  );
}
