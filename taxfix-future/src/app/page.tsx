"use client";

import { AnimatePresence } from "framer-motion";
import { useStore } from "@/store";
import { Home } from "@/components/Home";
import { Compare } from "@/components/Compare";
import { Search } from "@/components/Search";
import { Changed } from "@/components/Changed";

export default function Page() {
  const view = useStore((s) => s.view);
  const scenario = useStore((s) => s.scenario);

  let content;
  if (view === "compare" && scenario) {
    content = <Compare key="compare" />;
  } else if (view === "search") {
    content = <Search key="search" />;
  } else if (view === "changed") {
    content = <Changed key="changed" />;
  } else {
    content = <Home key="home" />;
  }

  return (
    <div className="device-frame flex flex-1 flex-col bg-white md:flex-none">
      <AnimatePresence mode="wait">{content}</AnimatePresence>
    </div>
  );
}
