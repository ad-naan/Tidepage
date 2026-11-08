/** Scene identities are distinct from authenticated multiplayer identities. */
export const harborCompanion = {
  id: "otter",
  kind: "companion",
  position: { x: -3.4, z: 1.2 },
  approach: { x: -2.3, z: 2.6 },
  radius: 2.3,
} as const;
export const harborTurtle = {
  id: "turtle",
  position: { x: -5.7, z: 1.8 },
} as const;

export type HarborSpeaker = {
  kind: "player" | "companion";
  id: string;
};

export type HarborDialogueMessage = {
  id: string;
  speaker: HarborSpeaker;
  text: string;
};

export function nearHarborCompanion(
  point: { x: number; z: number },
  companion: { x: number; z: number } = harborCompanion.position,
) {
  return (
    Math.hypot(point.x - companion.x, point.z - companion.z) <
    harborCompanion.radius
  );
}
