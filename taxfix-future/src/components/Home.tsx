"use client";

import { useStore } from "@/store";
import { eurMonth, eurRounded } from "@/lib/format";
import { BigNumber, Card, GhostButton } from "./ui";
import { FutureGraph } from "./FutureGraph";
import { LifePrompt } from "./LifePrompt";

export function Home() {
  const profile = useStore((s) => s.profile);
  const baseResult = useStore((s) => s.baseResult);
  const runSearch = useStore((s) => s.runSearch);

  const y2028 = baseResult.projection.find((p) => p.year === 2028);
  const y2030 = baseResult.projection.find((p) => p.year === 2030);

  return (
    <div className="flex flex-col gap-6 px-5 pb-10 pt-8">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs font-medium uppercase tracking-wide text-muted">
            {profile.name}, {profile.age} · {profile.city}
          </div>
        </div>
        <div className="h-8 w-8 rounded-full bg-accent-soft" />
      </div>

      <div>
        <div className="text-xs font-medium uppercase tracking-wide text-muted">
          Net income, this month
        </div>
        <BigNumber size="xl" className="mt-1 text-accent-strong">
          {eurMonth(baseResult.annualNetIncome / 12)}
        </BigNumber>
      </div>

      <Card>
        <FutureGraph base={baseResult.projection} height={140} />
        <div className="mt-3 flex justify-between text-xs text-muted">
          <span>
            2028 · roughly{" "}
            <span className="text-foreground">{y2028 ? eurRounded(y2028.savings) : "—"}</span>
          </span>
          <span>
            2030 · roughly{" "}
            <span className="text-foreground">{y2030 ? eurRounded(y2030.savings) : "—"}</span>
          </span>
        </div>
      </Card>

      <LifePrompt />

      <GhostButton onClick={() => runSearch()} className="text-center">
        Find me a better future →
      </GhostButton>
    </div>
  );
}
