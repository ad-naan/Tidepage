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

/** One brief reveal for the first rows, with no stagger on later batches. */
export function listItemMotion(index: number, reduced: boolean | null) {
  return reduced || index >= 4
    ? { initial: false as const }
    : {
        initial: { opacity: 0.75 },
        animate: { opacity: 1 },
        transition: {
          duration: 0.16,
          delay: index * 0.018,
          ease: "easeOut" as const,
        },
      };
}
