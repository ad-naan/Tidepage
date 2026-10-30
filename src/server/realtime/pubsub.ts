import "server-only";
import { EventEmitter } from "node:events";
import type { Redis } from "ioredis";
import { getEnv } from "../config/env";
import { log } from "../observability/logger";
import { getRedis } from "../cache/redis";

/**
 * 跨实例实时消息通道，为 Socket.IO / 世界空间多人互动预留。
 *
 * - 配置 REDIS_URL 时使用 Redis 发布订阅（多实例广播）；
 * - 未配置或连接失败时退化为进程内事件总线（单实例开发依旧可用）。
 *
 * 通道名会加上 CACHE_NAMESPACE 前缀，避免与其他项目共用的 Redis 冲突。
 */
export interface PubSub {
  publish(channel: string, message: string): Promise<void>;
  subscribe(
    channel: string,
    listener: (message: string) => void,
  ): Promise<() => void>;
}

type GlobalBus = {
  adnaanPubSub?: PubSub;
  adnaanSubClient?: Redis;
  adnaanLocalBus?: EventEmitter;
};
const globalBus = globalThis as unknown as GlobalBus;

function channelName(channel: string): string {
  return `${getEnv().CACHE_NAMESPACE}:realtime:${channel}`;
}

function localPubSub(): PubSub {
  const emitter = (globalBus.adnaanLocalBus ??= new EventEmitter());
  return {
    async publish(channel, message) {
      emitter.emit(channelName(channel), message);
    },
    async subscribe(channel, listener) {
      const topic = channelName(channel);
      emitter.on(topic, listener);
      return () => emitter.off(topic, listener);
    },
  };
}

async function redisPubSub(): Promise<PubSub | null> {
  const publisher = await getRedis();
  if (!publisher) return null;
  try {
    // 订阅是阻塞命令，必须使用独立连接；duplicate 继承超时与重试策略。
    const subscriber = (globalBus.adnaanSubClient ??= publisher.duplicate({
      lazyConnect: false,
    }));
    subscriber.on("error", () =>
      log("warn", "realtime.pubsub_connection_error", {
        component: "pubsub",
      }),
    );
    return {
      async publish(channel, message) {
        await publisher.publish(channelName(channel), message);
      },
      async subscribe(channel, listener) {
        const topic = channelName(channel);
        const wrapped = (ch: string, raw: string) => {
          if (ch === topic) listener(raw);
        };
        await subscriber.subscribe(topic);
        subscriber.on("message", wrapped);
        return async () => {
          subscriber.off("message", wrapped);
          await subscriber.unsubscribe(topic).catch(() => {});
        };
      },
    };
  } catch {
    log("warn", "realtime.pubsub_fallback_local", { component: "pubsub" });
    return null;
  }
}

export async function getPubSub(): Promise<PubSub> {
  return (globalBus.adnaanPubSub ??= (await redisPubSub()) ?? localPubSub());
}

export async function closePubSub(): Promise<void> {
  globalBus.adnaanPubSub = undefined;
  globalBus.adnaanLocalBus?.removeAllListeners();
  globalBus.adnaanLocalBus = undefined;
  await globalBus.adnaanSubClient?.quit().catch(() => {});
  globalBus.adnaanSubClient = undefined;
}
