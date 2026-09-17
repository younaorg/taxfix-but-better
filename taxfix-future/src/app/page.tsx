"use client";

import { useStore } from "@/store";
import { Home } from "@/components/Home";
import { Comparison } from "@/components/Comparison";
import { FutureSearch } from "@/components/FutureSearch";
import { FutureChanged } from "@/components/FutureChanged";

export default function Page() {
  const view = useStore((s) => s.view);

  return (
    <div className="flex flex-1 items-start justify-center bg-background py-0 sm:items-center sm:py-10">
      <div className="min-h-screen w-full max-w-[420px] overflow-y-auto bg-background sm:min-h-[840px] sm:rounded-[2.5rem] sm:border sm:border-border sm:shadow-[0_0_0_10px_var(--surface-2),0_20px_60px_-20px_rgba(0,0,0,0.6)]">
        {view === "home" && <Home />}
        {view === "compare" && <Comparison />}
        {view === "search" && <FutureSearch />}
        {view === "changed" && <FutureChanged />}
      </div>
    </div>
  );
}
