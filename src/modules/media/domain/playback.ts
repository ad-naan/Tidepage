export const playbackModes = ["loop", "single", "shuffle"] as const;
export type PlaybackMode = (typeof playbackModes)[number];
export function nextPlaybackMode(mode: PlaybackMode): PlaybackMode {
  return playbackModes[
    (playbackModes.indexOf(mode) + 1) % playbackModes.length
  ];
}

/** Uniformly choose any track except the current one. */
export function randomTrackIndex(
  current: number,
  count: number,
  random = Math.random,
) {
  if (count <= 1) return 0;
  const choice = Math.floor(
    Math.min(0.999999999, Math.max(0, random())) * (count - 1),
  );
  return choice >= current ? choice + 1 : choice;
}
