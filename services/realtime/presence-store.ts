import type { RedisClientType } from "redis";
import {
  offlineSnapshot,
  PRESENCE_TTL_MS,
  presenceSnapshotSchema,
  type PresenceSnapshot,
  type PresenceUpdate,
} from "../../src/shared/realtime/protocol";

export type UpdateResult = "OK" | "SUPERSEDED" | "LEASE_EXPIRED";
export interface PresenceStore {
  claim(owner: string): Promise<void>;
  update(owner: string, update: PresenceUpdate): Promise<UpdateResult>;
  release(owner: string): Promise<boolean>;
  read(): Promise<PresenceSnapshot>;
}
export function memoryPresenceStore(now = Date.now): PresenceStore {
  let owner = "",
    sequence = -1,
    revision = 0,
    leaseUntil = 0,
    snapshot = offlineSnapshot();
  return {
    async claim(next) {
      owner = next;
      sequence = -1;
      leaseUntil = now() + PRESENCE_TTL_MS;
      snapshot = offlineSnapshot(++revision);
    },
    async update(candidate, update) {
      if (leaseUntil <= now()) return "LEASE_EXPIRED";
      if (owner !== candidate || update.sequence < sequence)
        return "SUPERSEDED";
      if (update.sequence === sequence) return "OK";
      sequence = update.sequence;
      leaseUntil = now() + PRESENCE_TTL_MS;
      const { sequence: ignored, ...data } = update;
      void ignored;
      snapshot = {
        ...data,
        revision: ++revision,
        updatedAt: now(),
        expiresAt: leaseUntil,
      };
      return "OK";
    },
    async release(candidate) {
      if (owner !== candidate) return false;
      owner = "";
      leaseUntil = 0;
      snapshot = offlineSnapshot(++revision);
      return true;
    },
    async read() {
      return snapshot.expiresAt > now()
        ? structuredClone(snapshot)
        : offlineSnapshot(revision);
    },
  };
}
export function redisPresenceStore(
  client: RedisClientType,
  namespace: string,
): PresenceStore {
  // Common hash tag permits atomic Lua operations on Redis Cluster as well.
  const prefix = `{${namespace}:author}`,
    lease = `${prefix}:lease`,
    state = `${prefix}:state`,
    revision = `${prefix}:revision`;
  const keys = [lease, state, revision];
  return {
    async claim(owner) {
      await client.eval(
        "local rev=redis.call('INCR',KEYS[3]);redis.call('HSET',KEYS[1],'owner',ARGV[1],'sequence',-1);redis.call('PEXPIRE',KEYS[1],ARGV[2]);redis.call('SET',KEYS[2],cjson.encode({version=1,revision=rev,status='offline',apps=cjson.decode('[]'),track=cjson.null,updatedAt=0,expiresAt=0}));return rev",
        { keys, arguments: [owner, String(PRESENCE_TTL_MS)] },
      );
    },
    async update(owner, update) {
      const { sequence, ...data } = update;
      const result = await client.eval(
        "local owner=redis.call('HGET',KEYS[1],'owner');if not owner then return 'LEASE_EXPIRED' end;if owner~=ARGV[1] then return 'SUPERSEDED' end;local seq=tonumber(redis.call('HGET',KEYS[1],'sequence'));if seq>tonumber(ARGV[2]) then return 'SUPERSEDED' end;if seq==tonumber(ARGV[2]) then return 'OK' end;local rev=redis.call('INCR',KEYS[3]);local clock=redis.call('TIME');local now=tonumber(clock[1])*1000+math.floor(tonumber(clock[2])/1000);local data=cjson.decode(ARGV[3]);data.revision=rev;data.updatedAt=now;data.expiresAt=now+tonumber(ARGV[4]);redis.call('HSET',KEYS[1],'sequence',ARGV[2]);redis.call('PEXPIRE',KEYS[1],ARGV[4]);redis.call('SET',KEYS[2],cjson.encode(data));return 'OK'",
        {
          keys,
          arguments: [
            owner,
            String(sequence),
            JSON.stringify(data),
            String(PRESENCE_TTL_MS),
          ],
        },
      );
      return result as UpdateResult;
    },
    async release(owner) {
      return (
        (await client.eval(
          "if redis.call('HGET',KEYS[1],'owner')~=ARGV[1] then return 0 end;redis.call('DEL',KEYS[1]);local rev=redis.call('INCR',KEYS[3]);redis.call('SET',KEYS[2],cjson.encode({version=1,revision=rev,status='offline',apps=cjson.decode('[]'),track=cjson.null,updatedAt=0,expiresAt=0}));return 1",
          { keys, arguments: [owner] },
        )) === 1
      );
    },
    async read() {
      const raw = await client.get(state);
      if (!raw) return offlineSnapshot();
      // Redis Lua cjson encodes empty arrays as objects; normalize only the known
      // empty apps field before validating all stored data.
      const data = JSON.parse(raw);
      if (
        data.apps &&
        !Array.isArray(data.apps) &&
        Object.keys(data.apps).length === 0
      )
        data.apps = [];
      const snapshot = presenceSnapshotSchema.parse(data);
      return snapshot.expiresAt > Date.now()
        ? snapshot
        : offlineSnapshot(snapshot.revision);
    },
  };
}
