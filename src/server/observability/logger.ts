import "server-only";
type Fields = {
  requestId?: string;
  method?: string;
  status?: number;
  durationMs?: number;
  component?: string;
  code?: string;
  digest?: string;
};
// Deliberately exclude request bodies, URLs, cookies, SQL and raw exception messages.
export function log(
  level: "info" | "warn" | "error",
  event: string,
  fields: Fields = {},
) {
  console[level](
    JSON.stringify({ time: new Date().toISOString(), level, event, ...fields }),
  );
}
