"use client";

import { ReactNode, useState } from "react";
import type { Certainty } from "@/types/simulation";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl border border-border bg-surface p-5 ${className}`}
    >
      {children}
    </div>
  );
}

export function BigNumber({
  children,
  size = "lg",
  className = "",
}: {
  children: ReactNode;
  size?: "md" | "lg" | "xl";
  className?: string;
}) {
  const sizes = {
    md: "text-4xl",
    lg: "text-5xl sm:text-6xl",
    xl: "text-6xl sm:text-7xl",
  };
  return (
    <div className={`tabular-nums font-semibold tracking-tight text-foreground ${sizes[size]} ${className}`}>
      {children}
    </div>
  );
}

const CERTAINTY_LABEL: Record<Certainty, string> = {
  known: "Known",
  estimated: "Estimated",
  assumed: "Assumed",
};

export function CertaintyBadge({ certainty }: { certainty: Certainty }) {
  const style =
    certainty === "known"
      ? "text-muted border-border"
      : certainty === "estimated"
        ? "text-accent-strong border-accent-soft"
        : "text-amber-300 border-amber-300/20";
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${style}`}>
      {CERTAINTY_LABEL[certainty]}
    </span>
  );
}

export function Assumptions({ items }: { items: string[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-3">
      <button
        onClick={() => setOpen((o) => !o)}
        className="text-xs font-medium text-muted underline decoration-dotted underline-offset-4 hover:text-foreground"
      >
        {open ? "Hide assumptions" : "View assumptions"}
      </button>
      {open && (
        <ul className="mt-2 space-y-1 text-xs leading-relaxed text-muted">
          {items.map((a) => (
            <li key={a} className="flex gap-2">
              <span className="text-accent">·</span>
              {a}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function Chip({
  children,
  onClick,
  active = false,
}: {
  children: ReactNode;
  onClick?: () => void;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-left text-xs leading-snug transition-colors ${
        active
          ? "border-accent bg-accent-soft text-foreground"
          : "border-border bg-surface-2 text-muted hover:border-accent-soft hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

export function PrimaryButton({
  children,
  onClick,
  disabled,
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40 ${className}`}
    >
      {children}
    </button>
  );
}

export function GhostButton({
  children,
  onClick,
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-muted transition-colors hover:border-accent-soft hover:text-foreground ${className}`}
    >
      {children}
    </button>
  );
}
