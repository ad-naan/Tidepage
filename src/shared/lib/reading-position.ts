export type ReadingPosition = {
  active: number;
  percent: number;
  started: boolean;
};
export const initialReadingPosition: ReadingPosition = {
  active: 0,
  percent: 0,
  started: false,
};

export function readingPosition({
  top,
  height,
  viewportHeight,
  safeTop,
  sections,
}: {
  top: number;
  height: number;
  viewportHeight: number;
  safeTop: number;
  sections: number[];
}): ReadingPosition {
  const started = top <= safeTop;
  const distance = Math.max(1, height - (viewportHeight - safeTop - 24));
  const percent = Math.round(
    Math.max(0, Math.min(1, (safeTop - top) / distance)) * 100,
  );
  let active = 0;
  for (let index = 0; index < sections.length; index++) {
    if (sections[index] <= safeTop + 24) active = index;
    else break;
  }
  return { active, percent, started };
}
