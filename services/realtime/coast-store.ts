import type { RedisClientType } from "redis";
import {
  emptyCoastRoom,
  type CoastRoom,
} from "../../src/modules/world/domain/coast-room";

export interface CoastStore {
  mutate<T>(change: (room: CoastRoom, now: number) => T): Promise<T>;
}
export function memoryCoastStore(clock = Date.now): CoastStore {
  let room = emptyCoastRoom(clock());
  return {
    async mutate(change) {
      const next = structuredClone(room);
      const result = change(next, clock());
      room = next;
      return result;
    },
  };
}

/** Small bounded room documents are committed with optimistic CAS across gateways. */
export function redisCoastStore(
  client: RedisClientType,
  namespace: string,
): CoastStore {
  const key = `{${namespace}:world}:sunset:v1`;
  return {
    async mutate(change) {
      for (let attempt = 0; attempt < 12; attempt++) {
        const [raw, clock] = await Promise.all([
          client.get(key),
          client.sendCommand(["TIME"]) as Promise<string[]>,
        ]);
        const now =
          Number(clock[0]) * 1000 + Math.floor(Number(clock[1]) / 1000);
        const next: CoastRoom = raw ? JSON.parse(raw) : emptyCoastRoom(now);
        const result = change(next, now);
        const committed = await client.eval(
          "local current=redis.call('GET',KEYS[1]);if (current or '')~=ARGV[1] then return 0 end;redis.call('SET',KEYS[1],ARGV[2],'PX',2400000);return 1",
          { keys: [key], arguments: [raw ?? "", JSON.stringify(next)] },
        );
        if (committed === 1) return result;
      }
      throw new Error("Coast room contention");
    },
  };
}
