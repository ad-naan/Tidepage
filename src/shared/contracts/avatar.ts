import { z } from "zod";

/** OAuth avatars are public HTTPS images, never credentials or executable URLs. */
export const avatarUrlSchema = z
  .string()
  .max(2048)
  .url()
  .refine((value) => {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password;
  });

export function publicAvatarUrl(value: unknown): string | null {
  const result = avatarUrlSchema.safeParse(value);
  return result.success ? result.data : null;
}
