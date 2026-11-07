export const spring = {
  type: "spring" as const,
  stiffness: 260,
  damping: 25,
  mass: 0.8,
};
export const softSpring = {
  type: "spring" as const,
  stiffness: 120,
  damping: 18,
  mass: 1,
};

/** Short, bounded stagger shared by content lists. Never replay it on scroll. */
export function listItemMotion(index: number, reduced: boolean | null) {
  return {
    initial: { opacity: 0, y: reduced ? 0 : 12 },
    animate: { opacity: 1, y: 0 },
    transition: reduced
      ? { duration: 0 }
      : { ...spring, delay: Math.min(index % 12, 7) * 0.045 },
  };
}
