import "server-only";
import { getEnv } from "@/server/config/env";
import { log } from "@/server/observability/logger";
import { createLocalBus, createRedisBus, type PubSub } from "./bus";
export type { PubSub } from "./bus";

const globalBus = globalThis as unknown as {
  tidepageBus?: { pending?: Promise<PubSub>; closing?: Promise<void> };
};
const state = (globalBus.tidepageBus ??= {});
export async function getPubSub(): Promise<PubSub> {
  await state.closing;
  if (!state.pending) {
    const env = getEnv();
    const report = () =>
      log("warn", "realtime.pubsub_error", { component: "pubsub" });
    // A configured Redis is a cluster contract. Fail visibly instead of silently
    // splitting processes into isolated local buses. PubSub is ephemeral, not a queue.
    state.pending = (
      env.REDIS_URL
        ? createRedisBus(env.REDIS_URL, env.CACHE_NAMESPACE, report)
        : Promise.resolve(createLocalBus(env.CACHE_NAMESPACE, report))
    ).catch((e) => {
      state.pending = undefined;
      throw e;
    });
  }
  return state.pending;
}
export async function closePubSub(): Promise<void> {
  if (state.closing) return state.closing;
  const pending = state.pending;
  state.pending = undefined;
  state.closing = (async () => {
    const bus = await pending?.catch(() => undefined);
    await bus?.close();
  })();
  try {
    await state.closing;
  } finally {
    state.closing = undefined;
  }
}
