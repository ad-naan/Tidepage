import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { getEnv } from "@/server/config/env";
import { getDb } from "@/server/db/client";
import { sessionsTable } from "@/modules/identity/infrastructure/schema";

const SESSION_TTL_MS = 12 * 60 * 60 * 1000;
export const sessionCookieName = "adnaan_session";

export const digest = (value: string) =>
  createHash("sha256").update(value).digest();

/** 为任意角色的用户签发会话：令牌哈希入库，原始令牌只进 HttpOnly cookie。 */
export async function issueSession(userId: string) {
  const env = getEnv();
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await getDb()
    .insert(sessionsTable)
    .values({ tokenHash: digest(token).toString("hex"), userId, expiresAt });
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
      .where(eq(sessionsTable.tokenHash, digest(token).toString("hex")));
  jar.delete(sessionCookieName);
}
