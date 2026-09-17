"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/store";
import { getCachedScenario, DEMO_PROMPT } from "@/data/prompt-cache";

/**
 * Hidden pitch-safety panel. Toggle with the ` key. Alt+1..6/0 fire each beat
 * deterministically so the live demo never depends on a flaky click sequence
 * or a live network call.
 */
export function DemoControls() {
  const [open, setOpen] = useState(false);
  const view = useStore((s) => s.view);
  const llmStatus = useStore((s) => s.llmStatus);
  const reset = useStore((s) => s.reset);
  const setScenario = useStore((s) => s.setScenario);
  const setView = useStore((s) => s.setView);
  const fireEvents = useStore((s) => s.fireEvents);
  const setLlmStatus = useStore((s) => s.setLlmStatus);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "`") {
        setOpen((o) => !o);
        return;
      }
      if (!e.altKey) return;

      if (e.code === "Digit1" || e.code === "Digit0") {
        e.preventDefault();
        reset();
      }
      if (e.code === "Digit2") {
        e.preventDefault();
        document.getElementById("life-prompt")?.focus();
      }
      if (e.code === "Digit3" || e.code === "Digit4") {
        e.preventDefault();
        const cached = getCachedScenario(DEMO_PROMPT);
        if (cached) {
          setLlmStatus({ source: "cache", latencyMs: 0 });
          setScenario(cached);
        }
      }
      if (e.code === "Digit5") {
        e.preventDefault();
        setView("search");
      }
      if (e.code === "Digit6") {
        e.preventDefault();
        fireEvents(["raise"]);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [reset, setScenario, setView, fireEvents, setLlmStatus]);

  if (!open) return null;

  const offline =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("offline") === "1";

  return (
    <div className="fixed bottom-2 right-2 z-[9999] max-w-[220px] rounded-[var(--radius-sm)] bg-[var(--brand-ink)] px-3 py-2 font-mono text-[11px] leading-relaxed text-[var(--surface-tint)] opacity-90">
      <div>view: {view}</div>
      <div>offline: {offline ? "1" : "0"}</div>
      <div>
        llm: {llmStatus.source ?? "—"} {llmStatus.latencyMs ?? "—"}ms
      </div>
      <div className="mt-1 text-white/50">
        Alt+1 reset · Alt+3 cached Munich · Alt+5 search · Alt+6 raise
      </div>
    </div>
  );
}
