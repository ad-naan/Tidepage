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
