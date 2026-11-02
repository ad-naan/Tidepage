import "server-only";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { and, eq } from "drizzle-orm";
import { getEnv } from "@/server/config/env";
import { getDb } from "@/server/db/client";
import { unauthorizedError, AppError } from "@/server/http/errors";
import {
  usersTable,
  sessionsTable,
} from "@/modules/identity/infrastructure/schema";

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
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000);
  await getDb()
    .insert(sessionsTable)
    .values({
      tokenHash: digest(token).toString("hex"),
      userId: author.id,
      expiresAt,
    });
  (await cookies()).set("adnaan_session", token, {
    httpOnly: true,
    secure: new URL(env.SITE_URL).protocol === "https:",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}
export async function deleteAuthorSession() {
  const jar = await cookies();
  const token = jar.get("adnaan_session")?.value;
  if (token)
    await getDb()
      .delete(sessionsTable)
      .where(eq(sessionsTable.tokenHash, digest(token).toString("hex")));
  jar.delete("adnaan_session");
}
