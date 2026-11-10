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

export const touchMotionQuery = "(pointer: coarse) and (hover: none)";

// ζ = c / (2√km). The press and surface springs settle without visible bounce.
export const pressSpring = {
  type: "spring" as const,
  stiffness: 540,
  damping: 33,
  mass: 0.5,
};
export const surfaceSpring = {
  type: "spring" as const,
  stiffness: 390,
  damping: 33,
  mass: 0.72,
  restDelta: 0.05,
  restSpeed: 0.2,
};

/** A short entrance for the first batch. Appended rows appear immediately. */
export function listItemMotion(index: number, reduced: boolean | null) {
  if (reduced || index >= 12) return { initial: false as const };
  const delay = Math.min(index, 6) * 0.035;
  return {
    initial: { opacity: 0.55, y: 8 },
    animate: { opacity: 1, y: 0 },
    transition: {
      y: { ...spring, delay },
      opacity: { duration: 0.28, delay, ease: "easeOut" as const },
    },
  };
}
