import "server-only";
import { getEnv } from "@/server/config/env";
import { AppError, tooManyRequestsError } from "@/server/http/errors";

let active = 0;
export function acquireModelSlot() {
  if (active >= 4) throw tooManyRequestsError(5);
  active++;
  return () => {
    active--;
  };
}

export async function requestModel(
  input: object,
  signal: AbortSignal,
  accept: string,
) {
  const env = getEnv();
  if (!env.AI_CHAT_COMPLETIONS_URL || !env.AI_MODEL)
    throw new AppError(
      "AI_UNAVAILABLE",
      "The model provider is not configured",
      503,
    );
  const response = await fetch(env.AI_CHAT_COMPLETIONS_URL, {
    method: "POST",
    signal,
    cache: "no-store",
    redirect: "error",
    headers: {
      "Content-Type": "application/json",
      Accept: accept,
      ...(env.AI_API_KEY && { Authorization: `Bearer ${env.AI_API_KEY}` }),
    },
    body: JSON.stringify({ model: env.AI_MODEL, ...input }),
  });
  if (!response.ok || !response.body) {
    await response.body?.cancel();
    throw new Error("Model provider request failed");
  }
  return response;
}
