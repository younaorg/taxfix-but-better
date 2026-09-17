"use client";

import { useEffect, useState } from "react";
import { animate } from "framer-motion";
import { useStore } from "@/store";
import { eurRounded, delta } from "@/lib/format";
import { GhostButton } from "./ui";

function AnimatedEuro({ from, to }: { from: number; to: number }) {
  const [value, setValue] = useState(from);

  useEffect(() => {
    const controls = animate(from, to, {
      duration: 1.1,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setValue(v),
    });
    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to]);

  return (
    <span className="tabular-nums">{eurRounded(value)}</span>
  );
}

export function FutureChanged() {
  const lastDelta = useStore((s) => s.lastDelta);
  const setView = useStore((s) => s.setView);

  if (!lastDelta) return null;

  return (
    <div className="flex min-h-[80vh] flex-col justify-center gap-8 px-5 py-10">
      <div>
        <div className="text-xs font-medium uppercase tracking-wide text-accent-strong">
          Your future changed
        </div>
        <div className="mt-2 text-sm text-muted">
          Estimated savings by {lastDelta.projectionYear}, under these assumptions
        </div>
      </div>

      <div className="text-5xl font-semibold tracking-tight text-foreground sm:text-6xl">
        <AnimatedEuro from={lastDelta.before} to={lastDelta.after} />
      </div>

      <div className="flex flex-col gap-2">
        {lastDelta.drivers.map((d) => (
          <div key={d.label} className="flex items-center justify-between text-sm">
            <span className="capitalize text-muted">{d.label}</span>
            <span className="tabular-nums text-foreground">{delta(d.amount)}</span>
          </div>
        ))}
      </div>

      <GhostButton onClick={() => setView("home")} className="text-center">
        Back to today
      </GhostButton>
    </div>
  );
}
