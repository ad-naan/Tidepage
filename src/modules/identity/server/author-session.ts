import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { getEnv } from "@/server/config/env";
import { getDb } from "@/server/db/client";
import { AppError, unauthorizedError } from "@/server/http/errors";
import { usersTable } from "@/modules/identity/infrastructure/schema";
import { issueSession, revokeCurrentSession } from "./session";

const digest = (value: string) => createHash("sha256").update(value).digest();

export async function createAuthorSession(key: string) {
  const env = getEnv();
  if (!env.ADMIN_ACCESS_KEY || !env.ADMIN_USER_ID)
    throw new AppError("AUTHOR_NOT_CONFIGURED", "", 503);
  if (!timingSafeEqual(digest(key), digest(env.ADMIN_ACCESS_KEY)))
    throw unauthorizedError();
  const [author] = await getDb()
    .select()
    .from(usersTable)
    .where(
      and(eq(usersTable.id, env.ADMIN_USER_ID), eq(usersTable.role, "admin")),
    );
  if (!author) throw unauthorizedError();
  await issueSession(author.id);
}

export async function deleteAuthorSession() {
  await revokeCurrentSession();
}
