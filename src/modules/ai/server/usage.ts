import "server-only";
import { sql } from "drizzle-orm";
import { getDb, type Database } from "@/server/db/client";
import { aiUsageTable } from "@/server/db/ai-usage-schema";
import { getEnv } from "@/server/config/env";
import { AppError, tooManyRequestsError } from "@/server/http/errors";
import { log } from "@/server/observability/logger";

export type ModelAccess = {
  audience: "harbor" | "editorial";
  accountId: string;
  db?: Database;
};

const dailyCalls = { harbor: 24, editorial: 300 };
const utcDay = sql<string>`(transaction_timestamp() AT TIME ZONE 'UTC')::date`;

function dailyLimitError() {
  const now = new Date();
  const nextDay = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + 1,
  );
  return tooManyRequestsError(
    Math.max(1, Math.ceil((nextDay - now.getTime()) / 1000)),
  );
}

/** Charge each dispatched model call before it leaves the server. Aborts and provider
 * errors do not refund reservations because the provider may already have billed them. */
export async function reserveModelUsage(access: ModelAccess, units: number) {
  const { audience, accountId, db = getDb() } = access;
  const env = getEnv();
  const siteLimit =
    audience === "harbor"
      ? env.AI_HARBOR_DAILY_UNITS
      : env.AI_EDITORIAL_DAILY_UNITS;
  if (units > siteLimit) throw dailyLimitError();
  try {
    await db.transaction(async (tx) => {
      async function spend(subject: string, amount: number, limit: number) {
        const used = sql<number>`CASE WHEN ${aiUsageTable.day} = excluded.day
          THEN ${aiUsageTable.used} + excluded.used ELSE excluded.used END`;
        const [reserved] = await tx
          .insert(aiUsageTable)
          .values({ scope: audience, subject, day: utcDay, used: amount })
          .onConflictDoUpdate({
            target: [aiUsageTable.scope, aiUsageTable.subject],
            set: { day: utcDay, used },
            setWhere: sql`${aiUsageTable.day} <= excluded.day AND (${used}) <= ${limit}`,
          })
          .returning({ used: aiUsageTable.used });
        if (!reserved) throw dailyLimitError();
      }
      await spend(accountId, 1, dailyCalls[audience]);
      await spend("", units, siteLimit);
    });
  } catch (error) {
    if (error instanceof AppError) throw error;
    log("error", "ai.usage_unavailable", { component: "ai" });
    throw new AppError(
      "AI_UNAVAILABLE",
      "Model usage limits are unavailable",
      503,
    );
  }
}
