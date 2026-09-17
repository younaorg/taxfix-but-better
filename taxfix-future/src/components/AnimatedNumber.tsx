"use client";

import { CSSProperties, useEffect, useRef } from "react";
import { animate, motion, useMotionValue, useTransform } from "framer-motion";
import { eurRounded } from "@/lib/format";

interface AnimatedNumberProps {
  value: number;
  className?: string;
  style?: CSSProperties;
  format?: (n: number) => string;
}

export function AnimatedNumber({ value, className, style, format = eurRounded }: AnimatedNumberProps) {
  const motionValue = useMotionValue(value);
  const rounded = useTransform(motionValue, (v) => format(v));
  const prev = useRef(value);

  useEffect(() => {
    const controls = animate(motionValue, value, {
      duration: 0.9,
      ease: [0.16, 1, 0.3, 1],
    });
    prev.current = value;
    return controls.stop;
  }, [value, motionValue]);

  return (
    <motion.span className={className} style={style}>
      {rounded}
    </motion.span>
  );
}
