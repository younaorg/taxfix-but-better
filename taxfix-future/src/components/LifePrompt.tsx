"use client";

import { useState } from "react";
import { useStore } from "@/store";
import type { Scenario } from "@/types/scenario";
import { Chip, PrimaryButton } from "./ui";

const SUGGESTIONS = [
  "I got offered €90k in Munich, the apartment is €1,650. Is it worth it?",
  "what if I move to Hamburg",
  "should I ask for a 10k raise",
  "what if I freelance on the side for 500 a month",
];

export function LifePrompt() {
  const profile = useStore((s) => s.profile);
  const setScenario = useStore((s) => s.setScenario);
  const setLlmStatus = useStore((s) => s.setLlmStatus);
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(prompt: string) {
    if (!prompt.trim() || loading) return;
    setLoading(true);
    const t0 = Date.now();
    try {
      const res = await fetch("/api/scenario/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, profile }),
      });
      const data = (await res.json()) as {
        scenario: Scenario;
        source: "llm" | "cache" | "fallback";
        latencyMs: number;
      };
      setLlmStatus({ source: data.source, latencyMs: data.latencyMs ?? Date.now() - t0 });
      setScenario(data.scenario);
    } catch {
      setLlmStatus({ source: "fallback", latencyMs: Date.now() - t0 });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <label className="text-xs font-medium uppercase tracking-wide text-muted">
        What&rsquo;s changing?
      </label>
      <textarea
        id="life-prompt"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            submit(value);
          }
        }}
        placeholder="I got offered €90k in Munich, rent's €1,650…"
        rows={2}
        className="w-full resize-none rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
      />
      <div className="flex flex-wrap gap-2">
        {SUGGESTIONS.map((s) => (
          <Chip key={s} onClick={() => { setValue(s); submit(s); }}>
            {s.length > 42 ? s.slice(0, 42) + "…" : s}
          </Chip>
        ))}
      </div>
      <PrimaryButton onClick={() => submit(value)} disabled={loading || !value.trim()}>
        {loading ? "Thinking…" : "Show me the future"}
      </PrimaryButton>
    </div>
  );
}
