import type { CoastInput, CoastIntent } from "@/shared/contracts/coast-space";

/** Old gateways strictly reject unknown fields, including running: false. */
export function coastMovementInput(
  intent: CoastIntent,
  sequence: number,
  movementVersion: 1 | 2 | 3,
): CoastInput {
  const input = {
    sequence,
    direction: intent.direction,
    action:
      intent.action === "jump" && movementVersion === 1
        ? "idle"
        : intent.action,
  };
  if (movementVersion === 3)
    return { ...input, running: !!intent.running, travel: intent.travel };
  return movementVersion === 2
    ? { ...input, running: !!intent.running }
    : input;
}

/** Physical keys keep working while a Chinese IME owns event.key. */
export function harborInputKey(event: { code: string; key: string }): string {
  if (/^Key[WASDJLIKQER]$/.test(event.code))
    return event.code.slice(3).toLowerCase();
  if (event.code === "Space") return " ";
  if (event.code === "ShiftLeft" || event.code === "ShiftRight") return "shift";
  return event.key.toLowerCase();
}
