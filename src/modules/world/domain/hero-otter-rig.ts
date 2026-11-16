export type OtterLook = { x: number; y: number };

export function otterLook(x: number, y: number): OtterLook {
  const limit = (value: number) =>
    Number.isFinite(value) ? Math.max(-1, Math.min(1, value)) : 0;
  return { x: limit(x), y: limit(y) };
}

/** Small weighted controls on the original texture; the feet and tail stay planted. */
export function createOtterRig(rest: Float32Array, size: number) {
  const weights = Array.from({ length: rest.length / 2 }, (_, index) => {
    const x = rest[index * 2] / size;
    const y = rest[index * 2 + 1] / size;
    const head = Math.max(0, Math.min(1, (0.65 - y) / 0.18));
    const eye = (cx: number) =>
      Math.exp(-(((x - cx) / 0.065) ** 2 + ((y - 0.375) / 0.06) ** 2));
    return { head, eyes: Math.max(eye(0.54), eye(0.8)) };
  });
  return (positions: Float32Array, input: OtterLook) => {
    const look = otterLook(input.x, input.y);
    const angle = look.x * 0.045;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    weights.forEach(({ head, eyes }, index) => {
      const i = index * 2;
      const x = rest[i] / size;
      const y = rest[i + 1] / size;
      const dx = x - 0.67;
      const dy = y - 0.57;
      positions[i] =
        (x +
          head * (dx * (cos - 1) - dy * sin + look.x * 0.014) +
          eyes * look.x * 0.007) *
        size;
      positions[i + 1] =
        (y +
          head * (dx * sin + dy * (cos - 1) + look.y * 0.012) +
          eyes * look.y * 0.005) *
        size;
    });
  };
}
