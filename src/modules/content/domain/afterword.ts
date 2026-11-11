import { z } from "zod";

export const afterwordSchema = z.object({
  note: z.string().max(1200),
  updates: z
    .array(
      z.object({
        date: z.iso.date(),
        text: z.string().max(2000),
      }),
    )
    .max(12),
});
export type Afterword = z.infer<typeof afterwordSchema>;
