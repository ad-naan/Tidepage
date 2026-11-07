import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { and, eq, gt } from "drizzle-orm";
import { getEnv } from "@/server/config/env";
import { getDb } from "@/server/db/client";
import {
  sessionsTable,
  usersTable,
} from "@/modules/identity/infrastructure/schema";
import type { Principal } from "@/modules/identity/domain/principal";

const SESSION_TTL_MS = 12 * 60 * 60 * 1000;
const sessionCookieName = "adnaan_session";

const tokenDigest = (value: string) =>
  createHash("sha256").update(value).digest("hex");

export async function getCurrentPrincipal(): Promise<Principal | null> {
  const token = (await cookies()).get(sessionCookieName)?.value;
  if (!token || !/^[a-zA-Z0-9_-]{43,128}$/.test(token)) return null;
  const [user] = await getDb()
    .select({
      id: usersTable.id,
      displayName: usersTable.displayName,
      role: usersTable.role,
    })
    .from(sessionsTable)
    .innerJoin(usersTable, eq(sessionsTable.userId, usersTable.id))
    .where(
      and(
        eq(sessionsTable.tokenHash, tokenDigest(token)),
        gt(sessionsTable.expiresAt, new Date()),
      ),
    )
    .limit(1);
  return user ?? null;
}

/** 为任意角色的用户签发会话：令牌哈希入库，原始令牌只进 HttpOnly cookie。 */
export async function issueSession(userId: string) {
  const env = getEnv();
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await getDb()
    .insert(sessionsTable)
    .values({ tokenHash: tokenDigest(token), userId, expiresAt });
  (await cookies()).set(sessionCookieName, token, {
    httpOnly: true,
    secure: new URL(env.SITE_URL).protocol === "https:",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

/** 注销当前会话：删除数据库记录并清除 cookie，读者与站主共用。 */
export async function revokeCurrentSession() {
  const jar = await cookies();
  const token = jar.get(sessionCookieName)?.value;
  if (token)
    await getDb()
      .delete(sessionsTable)
      .where(eq(sessionsTable.tokenHash, tokenDigest(token)));
  jar.delete(sessionCookieName);
}
