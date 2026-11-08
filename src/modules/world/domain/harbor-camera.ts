export const HARBOR_CAMERA_PITCH = { min: -1.4, max: 1.35 } as const;
export function clampHarborPitch(pitch: number) {
  return Math.max(
    HARBOR_CAMERA_PITCH.min,
    Math.min(HARBOR_CAMERA_PITCH.max, pitch),
  );
}

/** Looking upward changes the sightline, never orbits the camera under the ground. */
export function harborCameraFrame(
  pivot: { x: number; y: number; z: number },
  heading: number,
  pitch: number,
  distance: number,
) {
  const orbit = Math.max(0.04, clampHarborPitch(pitch));
  const position = {
    x: pivot.x + Math.sin(heading) * Math.cos(orbit) * distance,
    y: pivot.y + Math.sin(orbit) * distance,
    z: pivot.z + Math.cos(heading) * Math.cos(orbit) * distance,
  };
  return {
    position,
    target: {
      ...pivot,
      y:
        pitch < 0
          ? position.y +
            Math.tan(-clampHarborPitch(pitch)) * Math.cos(orbit) * distance
          : pivot.y,
    },
  };
}

type CameraPoint = { x: number; y: number; z: number };

/** Frame a pair or a small conversation circle with space between the actors. */
export function harborDialogueFrame(
  player: CameraPoint,
  companion: CameraPoint,
  previous: CameraPoint,
  narrow: boolean,
  indoors: boolean,
  listener?: CameraPoint,
) {
  const actors = listener ? [player, companion, listener] : [player, companion];
  const target = {
    x: actors.reduce((sum, p) => sum + p.x, 0) / actors.length,
    y: Math.max(player.y, companion.y) + 0.8,
    z: actors.reduce((sum, p) => sum + p.z, 0) / actors.length,
  };
  const dx = player.x - companion.x,
    dz = player.z - companion.z;
  const length = Math.hypot(dx, dz);
  let sideX = length > 0.1 ? dz / length : 1;
  let sideZ = length > 0.1 ? -dx / length : 0;
  if (listener) {
    let best = -Infinity;
    for (let i = 0; i < 36; i++) {
      const angle = (i * Math.PI) / 18;
      const x = Math.sin(angle),
        z = Math.cos(angle);
      const projected = actors.map((p) => p.x * z - p.z * x);
      const separation = Math.min(
        Math.abs(projected[0] - projected[1]),
        Math.abs(projected[0] - projected[2]),
        Math.abs(projected[1] - projected[2]),
      );
      const familiarSide =
        (x * (previous.x - target.x) + z * (previous.z - target.z)) /
        Math.max(1, Math.hypot(previous.x - target.x, previous.z - target.z));
      const score = separation + familiarSide * 0.02;
      if (score > best) {
        best = score;
        sideX = x;
        sideZ = z;
      }
    }
  }
  if (sideX * (previous.x - target.x) + sideZ * (previous.z - target.z) < 0) {
    sideX *= -1;
    sideZ *= -1;
  }
  const spread = Math.max(
    ...actors.map((p) => Math.hypot(p.x - target.x, p.z - target.z)),
  );
  const distance = Math.max(6, spread * 2.5) * (narrow ? 1.9 : 1);
  return {
    target,
    position: {
      x: target.x + sideX * (indoors ? 1.5 : distance),
      y: target.y + (indoors ? 6 : 2.8),
      z: target.z + sideZ * (indoors ? 1.5 : distance),
    },
  };
}
