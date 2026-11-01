import type { Instrumentation } from "next";
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { getEnv } = await import("@/server/config/env");
    const { log } = await import("@/server/observability/logger");
    getEnv();
    log("info", "application.configured", { component: "postgres" });
  }
}
export const onRequestError: Instrumentation.onRequestError = async (error) => {
  const { log } = await import("@/server/observability/logger");
  const digest =
    error && typeof error === "object" && "digest" in error
      ? String(error.digest)
      : undefined;
  log("error", "next.request_error", { component: "next", digest });
};
