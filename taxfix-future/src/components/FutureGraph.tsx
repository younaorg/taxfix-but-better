"use client";

import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { YearSnapshot } from "@/types/simulation";
import { eurRounded } from "@/lib/format";

interface FutureGraphProps {
  baseline: YearSnapshot[];
  scenario?: YearSnapshot[];
  height?: number;
}

interface ChartRow {
  year: number;
  baseline: number;
  scenario?: number;
}

function mergeSeries(baseline: YearSnapshot[], scenario?: YearSnapshot[]): ChartRow[] {
  return baseline.map((b, i) => ({
    year: b.year,
    baseline: b.savings,
    scenario: scenario?.[i]?.savings,
  }));
}

interface TooltipEntry {
  dataKey?: string;
  value?: number;
  color?: string;
}

const SERIES_LABEL: Record<string, string> = {
  baseline: "Today's path",
  scenario: "This scenario",
};

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string | number;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-2xl bg-white px-4 py-3 shadow-[0_12px_30px_-10px_rgba(12,11,10,0.25)]">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--foreground-muted)]">
        {label}
      </p>
      {payload.map(
        (entry) =>
          entry.value !== undefined && (
            <p
              key={entry.dataKey}
              className="font-display text-base font-bold leading-tight"
              style={{ color: entry.dataKey === "scenario" ? "var(--brand-dark)" : "#8b9385" }}
            >
              {SERIES_LABEL[entry.dataKey ?? ""] ?? entry.dataKey}: {eurRounded(entry.value)}
            </p>
          )
      )}
    </div>
  );
}

export function FutureGraph({ baseline, scenario, height = 220 }: FutureGraphProps) {
  const data = mergeSeries(baseline, scenario);
  const years = data.map((d) => d.year);

  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="scenarioFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--brand)" stopOpacity={0.5} />
              <stop offset="100%" stopColor="var(--brand)" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="baselineFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#9aa596" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#9aa596" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="year"
            axisLine={false}
            tickLine={false}
            ticks={[years[0], years[Math.floor(years.length / 2)], years[years.length - 1]]}
            tick={{ fill: "var(--foreground-muted)", fontSize: 12 }}
          />
          <YAxis hide domain={["dataMin - 2000", "dataMax + 2000"]} />
          <Tooltip content={<ChartTooltip />} cursor={{ stroke: "rgba(255,255,255,0.3)" }} />
          <Area
            type="monotone"
            dataKey="baseline"
            stroke={scenario ? "#9aa596" : "var(--brand)"}
            strokeWidth={scenario ? 2 : 3}
            fill="url(#baselineFill)"
            isAnimationActive
            animationDuration={700}
          />
          {scenario && (
            <Area
              type="monotone"
              dataKey="scenario"
              stroke="var(--brand)"
              strokeWidth={3}
              fill="url(#scenarioFill)"
              isAnimationActive
              animationDuration={700}
            />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
