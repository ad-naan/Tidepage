import "server-only";
import { getEnv } from "@/server/config/env";
import { AppError, tooManyRequestsError } from "@/server/http/errors";
import { reserveModelUsage, type ModelAccess } from "./usage";

let active = 0;
let harborActive = 0;
const harborAccounts = new Set<string>();
export function acquireModelSlot(access: ModelAccess) {
  const harbor = access.audience === "harbor";
  if (
    active >= 4 ||
    (harbor && (harborActive >= 2 || harborAccounts.has(access.accountId)))
  )
    throw tooManyRequestsError(5);
  active++;
  if (harbor) {
    harborActive++;
    harborAccounts.add(access.accountId);
  }
  return () => {
    active--;
    if (harbor) {
      harborActive--;
      harborAccounts.delete(access.accountId);
    }
  };
}

export async function requestModel(
  access: ModelAccess,
  input: {
    messages: unknown[];
    stream: boolean;
    max_completion_tokens: number;
    tools?: unknown[];
    tool_choice?: "auto";
  },
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
  const body = JSON.stringify({ ...input, model: env.AI_MODEL });
  signal.throwIfAborted();
  await reserveModelUsage(
    access,
    Buffer.byteLength(body, "utf8") + input.max_completion_tokens,
  );
  signal.throwIfAborted();
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
    body,
  });
  if (!response.ok || !response.body) {
    await response.body?.cancel();
    throw new Error("Model provider request failed");
  }
  return response;
}
