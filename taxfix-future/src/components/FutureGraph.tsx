"use client";

import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { eurRounded } from "@/lib/format";
import type { ProjectionPoint } from "@/simulation/projection";

interface FutureGraphProps {
  base: ProjectionPoint[];
  scenario?: ProjectionPoint[] | null;
  height?: number;
}

interface Row {
  year: number;
  base: number;
  scenario?: number;
}

export function FutureGraph({ base, scenario, height = 180 }: FutureGraphProps) {
  const rows: Row[] = base.map((p, i) => ({
    year: p.year,
    base: p.savings,
    scenario: scenario?.[i]?.savings,
  }));

  const years = rows.map((r) => r.year);
  const ticks = years.length >= 3
    ? [years[0], years[Math.floor((years.length - 1) / 2)], years[years.length - 1]]
    : years;

  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={rows} margin={{ top: 8, right: 16, bottom: 0, left: 16 }}>
          <defs>
            <linearGradient id="baseFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8f8aa8" stopOpacity={0.25} />
              <stop offset="100%" stopColor="#8f8aa8" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="scenarioFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8b6bff" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#8b6bff" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="year"
            ticks={ticks}
            interval={0}
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#8f8aa8", fontSize: 11 }}
            padding={{ left: 8, right: 8 }}
          />
          <YAxis hide domain={["dataMin", "dataMax"]} />
          <Tooltip
            formatter={(value) => eurRounded(Number(value))}
            labelFormatter={(label) => `${label}`}
            contentStyle={{
              background: "#1d1a2b",
              border: "1px solid #2a2638",
              borderRadius: 8,
              fontSize: 12,
            }}
            labelStyle={{ color: "#8f8aa8" }}
          />
          <Area
            type="monotone"
            dataKey="base"
            stroke="#8f8aa8"
            strokeWidth={2}
            fill="url(#baseFill)"
          />
          {scenario && (
            <Area
              type="monotone"
              dataKey="scenario"
              stroke="#8b6bff"
              strokeWidth={2.5}
              fill="url(#scenarioFill)"
            />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
