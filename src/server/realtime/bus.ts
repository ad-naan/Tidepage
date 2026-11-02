import { EventEmitter } from "node:events";
import { Redis } from "ioredis";

export interface PubSub {
  publish(channel: string, message: string): Promise<void>;
  subscribe(
    channel: string,
    listener: (message: string) => void,
  ): Promise<() => Promise<void>>;
  close(): Promise<void>;
}
const topicName = (namespace: string, channel: string) => {
  if (!/^[a-zA-Z0-9:_-]{1,128}$/.test(channel))
    throw new Error("Invalid realtime channel");
  return `${namespace}:realtime:${channel}`;
};
export function createLocalBus(namespace: string, onError: () => void): PubSub {
  const emitter = new EventEmitter();
  let closed = false;
  return {
    async publish(channel, message) {
      if (closed) throw new Error("Realtime bus closed");
      emitter.emit(topicName(namespace, channel), message);
    },
    async subscribe(channel, listener) {
      if (closed) throw new Error("Realtime bus closed");
      const topic = topicName(namespace, channel),
        wrapped = (raw: string) => {
          try {
            listener(raw);
          } catch {
            onError();
          }
        };
      emitter.on(topic, wrapped);
      return async () => {
        emitter.off(topic, wrapped);
      };
    },
    async close() {
      closed = true;
      emitter.removeAllListeners();
    },
  };
}
export async function createRedisBus(
  url: string,
  namespace: string,
  onError: () => void,
): Promise<PubSub> {
  const options = {
    lazyConnect: true,
    enableOfflineQueue: false,
    connectTimeout: 1500,
    commandTimeout: 2000,
    maxRetriesPerRequest: 0,
    retryStrategy: (n: number) => Math.min(250 * n, 5000),
  };
  const publisher = new Redis(url, options),
    subscriber = new Redis(url, options);
  publisher.on("error", onError);
  subscriber.on("error", onError);
  try {
    await Promise.all([publisher.connect(), subscriber.connect()]);
  } catch (e) {
    publisher.disconnect();
    subscriber.disconnect();
    throw e;
  }
  const listeners = new Map<string, Set<(raw: string) => void>>();
  let closed = false;
  subscriber.on("message", (topic, raw) => {
    for (const callback of listeners.get(topic) ?? []) {
      try {
        callback(raw);
      } catch {
        onError();
      }
    }
  });
  let queue = Promise.resolve();
  const serialize = <T>(fn: () => Promise<T>) => {
    const next = queue.then(fn);
    queue = next.then(
      () => {},
      () => {},
    );
    return next;
  };
  return {
    async publish(channel, message) {
      if (closed) throw new Error("Realtime bus closed");
      await publisher.publish(topicName(namespace, channel), message);
    },
    subscribe(channel, listener) {
      return serialize(async () => {
        if (closed) throw new Error("Realtime bus closed");
        const topic = topicName(namespace, channel);
        let group = listeners.get(topic);
        if (!group) {
          group = new Set();
          listeners.set(topic, group);
          try {
            await subscriber.subscribe(topic);
          } catch (e) {
            listeners.delete(topic);
            throw e;
          }
        }
        const wrapped = (raw: string) => listener(raw);
        group.add(wrapped);
        let active = true;
        return () =>
          serialize(async () => {
            if (!active || closed) return;
            active = false;
            const current = listeners.get(topic);
            current?.delete(wrapped);
            if (current?.size === 0) {
              listeners.delete(topic);
              await subscriber.unsubscribe(topic);
            }
          });
      });
    },
    async close() {
      closed = true;
      listeners.clear();
      publisher.disconnect();
      subscriber.disconnect();
      await queue;
    },
  };
}
