"use client";
import { useEffect } from "react";
import {
  motion,
  useReducedMotion,
  useSpring,
  useTransform,
} from "motion/react";
export function AnimatedNumber({ value }: { value: number }) {
  const reduced = useReducedMotion();
  const number = useSpring(0, { stiffness: 80, damping: 22, mass: 0.8 });
  const formatted = useTransform(number, (n) =>
    Math.round(n).toLocaleString("zh-CN"),
  );
  useEffect(() => {
    if (reduced) number.jump(value);
    else number.set(value);
  }, [number, reduced, value]);
  return (
    <motion.span aria-label={value.toLocaleString("zh-CN")}>
      {formatted}
    </motion.span>
  );
}
