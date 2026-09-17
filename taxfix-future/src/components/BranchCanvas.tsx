"use client";

import { motion } from "framer-motion";
import { useMemo } from "react";

// Deterministic pseudo-random width so the animation is stable across renders.
function seededWidth(i: number): number {
  const x = Math.sin(i * 999.17) * 10000;
  return 30 + (x - Math.floor(x)) * 65;
}

export function BranchCanvas({ evaluated }: { evaluated: number }) {
  const rowCount = 28;
  const visibleRows = Math.min(rowCount, Math.ceil((evaluated / 2304) * rowCount));

  const rows = useMemo(
    () => Array.from({ length: rowCount }, (_, i) => seededWidth(i)),
    []
  );

  return (
    <div className="flex h-56 flex-col justify-start gap-1.5 overflow-hidden rounded-2xl border border-border bg-surface p-4">
      {rows.map((width, i) => (
        <motion.div
          key={i}
          className="h-1.5 rounded-full bg-gradient-to-r from-accent to-accent-strong"
          initial={{ opacity: 0, scaleX: 0 }}
          animate={
            i < visibleRows
              ? { opacity: 0.25 + (i % 5) * 0.12, scaleX: 1 }
              : { opacity: 0, scaleX: 0 }
          }
          transition={{ duration: 0.35, delay: (i % 6) * 0.02 }}
          style={{ width: `${width}%`, transformOrigin: "left" }}
        />
      ))}
    </div>
  );
}
