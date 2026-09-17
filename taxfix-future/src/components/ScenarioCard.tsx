"use client";

import { motion } from "framer-motion";
import type { Ranked } from "@/types/simulation";
import { eur, delta } from "@/lib/format";
import { Card } from "./ui";

export function ScenarioCard({ ranked, baseDisposable, index }: { ranked: Ranked; baseDisposable: number; index: number }) {
  const diff = ranked.result.annualDisposableIncome - baseDisposable;
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.08 }}
    >
      <Card className="flex flex-col gap-1.5">
        <div className="text-sm font-semibold text-foreground">
          {ranked.title ?? ranked.city}
        </div>
        <div className="text-xs leading-relaxed text-muted">{ranked.rationale}</div>
        <div className="mt-2 flex items-center justify-between">
          <div className="text-xs text-muted">
            {ranked.city} · {eur(ranked.grossSalary)} · {eur(ranked.monthlyRent)}/mo rent
          </div>
          <div className="text-sm font-semibold text-accent-strong tabular-nums">
            {delta(diff)}/yr
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
