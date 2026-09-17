"use client";

import { useEffect, useState } from "react";
import { DEMO_PROMPT, DEMO_SCENARIO } from "@/data/prompt-cache";
import { DEFAULT_SEARCH_CONFIG } from "@/agents/future-search-agent";
import { useStore } from "@/store";

export function DemoControls() {
  const [open, setOpen] = useState(false);
  const view = useStore((s) => s.view);
  const llmStatus = useStore((s) => s.llmStatus);
  const reset = useStore((s) => s.reset);
  const setScenario = useStore((s) => s.setScenario);
  const setView = useStore((s) => s.setView);
  const runSearch = useStore((s) => s.runSearch);
  const fireEvent = useStore((s) => s.fireEvent);
  const setLlmStatus = useStore((s) => s.setLlmStatus);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "`") {
        setOpen((o) => !o);
        return;
      }
      if (!e.altKey) return;
      if (e.code === "Digit1") {
        e.preventDefault();
        reset();
      }
      if (e.code === "Digit2") {
        e.preventDefault();
        document.getElementById("life-prompt")?.focus();
      }
      if (e.code === "Digit3") {
        e.preventDefault();
        setLlmStatus({ source: "cache", latencyMs: 0 });
        setScenario(DEMO_SCENARIO);
      }
      if (e.code === "Digit4") {
        e.preventDefault();
        setScenario(DEMO_SCENARIO);
        setView("compare");
      }
      if (e.code === "Digit5") {
        e.preventDefault();
        void runSearch(DEFAULT_SEARCH_CONFIG);
      }
      if (e.code === "Digit6") {
        e.preventDefault();
        fireEvent("raise");
      }
      if (e.code === "Digit0") {
        e.preventDefault();
        reset();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [reset, setScenario, setView, runSearch, fireEvent, setLlmStatus]);

  if (!open) return null;
  const offline =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("offline") === "1";

  return (
    <div
      style={{
        position: "fixed",
        right: 8,
        bottom: 8,
        zIndex: 9999,
        background: "#111",
        color: "#c8c8c8",
        font: "11px/1.4 ui-monospace, monospace",
        padding: "8px 10px",
        borderRadius: 6,
        opacity: 0.85,
        maxWidth: 220,
      }}
    >
      <div>view: {view}</div>
      <div>offline: {offline ? "1" : "0"}</div>
      <div>
        llm: {llmStatus.source ?? "—"} {llmStatus.latencyMs ?? "—"}ms
      </div>
      <div style={{ marginTop: 4, opacity: 0.6 }}>
        Alt+1 reset · Alt+3 {DEMO_PROMPT.slice(0, 18)}…
      </div>
    </div>
  );
}
