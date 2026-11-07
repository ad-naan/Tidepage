import { apiGet, apiSend } from "@/shared/http/client";
type Snapshot = { revision: number; value: unknown };
const load = (key: string) =>
  apiGet<Snapshot>(`/api/v1/workbench/${encodeURIComponent(key)}`);
export async function readWorkbenchRecord(key: string): Promise<unknown> {
  const record = await load(key);
  return record.revision === 0 ? undefined : record.value;
}
/** Keep the payload and its expected server revision in the same operation. */
export async function updateWorkbenchRecord<T>(
  key: string,
  change: (current: unknown) => T,
): Promise<T> {
  const write = async () => {
    const record = await load(key);
    const value = change(record.revision === 0 ? undefined : record.value);
    await apiSend(`/api/v1/workbench/${encodeURIComponent(key)}`, "PUT", {
      value,
      revision: record.revision,
    });
    return value;
  };
  // Web Locks is unavailable on HTTP LAN previews. The server's revision check
  // remains authoritative even when browser-local serialization is unavailable.
  return navigator.locks
    ? navigator.locks.request(`tidepage:${key}`, write)
    : write();
}
