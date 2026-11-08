import { z } from "zod";
import { localeSchema } from "@/shared/i18n/schema";

export const companionTurnSchema = z
  .object({
    speaker: z.enum(["otter", "turtle"]),
    reply: z.string().trim().min(1).max(180),
  })
  .strict();
export type CompanionTurn = z.infer<typeof companionTurnSchema>;
export const companionConversationSchema = z
  .object({
    locale: localeSchema,
    night: z.boolean(),
    topic: z.string().trim().min(1).max(180),
    turns: z.array(companionTurnSchema).max(3),
  })
  .strict()
  .refine(
    (input) =>
      input.turns.every(
        (turn, index) => turn.speaker === (index % 2 ? "turtle" : "otter"),
      ),
    { message: "Companions must take turns" },
  );

/** Four bounded, causal turns. Cancellation prevents every subsequent model request. */
export async function converseCompanions(options: {
  signal: AbortSignal;
  next: (turns: CompanionTurn[], signal: AbortSignal) => Promise<CompanionTurn>;
  speak: (turn: CompanionTurn) => void;
  wait: (milliseconds: number, signal: AbortSignal) => Promise<void>;
}) {
  const turns: CompanionTurn[] = [];
  for (let i = 0; i < 4; i++) {
    options.signal.throwIfAborted();
    const turn = companionTurnSchema.parse(
      await options.next([...turns], options.signal),
    );
    options.signal.throwIfAborted();
    if (turn.speaker !== (i % 2 ? "turtle" : "otter"))
      throw new Error("Unexpected companion");
    turns.push(turn);
    options.speak(turn);
    await options.wait(
      Math.min(14_000, Math.max(5_000, Array.from(turn.reply).length * 140)),
      options.signal,
    );
  }
  return turns;
}
