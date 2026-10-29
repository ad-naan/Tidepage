export interface CacheStore {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds: number): Promise<void>;
  delete(key: string): Promise<void>;
}
export const noCache: CacheStore = {
  get: async () => null,
  set: async () => {},
  delete: async () => {},
};
