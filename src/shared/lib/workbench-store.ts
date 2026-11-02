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
  return navigator.locks.request(`tidepage:${key}`, async () => {
    const record = await load(key);
    const value = change(record.revision === 0 ? undefined : record.value);
    await apiSend(`/api/v1/workbench/${encodeURIComponent(key)}`, "PUT", {
      value,
      revision: record.revision,
    });
    return value;
  });
}
