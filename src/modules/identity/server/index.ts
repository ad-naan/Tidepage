import "server-only";
import { createHash } from "node:crypto";
import { cookies } from "next/headers";
import { and, eq, gt } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { getEnv } from "@/server/config/env";
import { AppError } from "@/server/http/errors";
import { sessionsTable, usersTable } from "../infrastructure/schema";
import type { Principal, Role } from "../domain/principal";

export async function getCurrentPrincipal(): Promise<Principal | null> {
  const token = (await cookies()).get("adnaan_session")?.value;
  if (!token || !/^[a-zA-Z0-9_-]{43,128}$/.test(token)) return null;
  if (!getEnv().DATABASE_URL)
    throw new AppError("IDENTITY_UNAVAILABLE", "账号服务尚未配置", 503);
  const tokenHash = createHash("sha256").update(token).digest("hex");
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
        eq(sessionsTable.tokenHash, tokenHash),
        gt(sessionsTable.expiresAt, new Date()),
      ),
    )
    .limit(1);
  return user ?? null;
}
export async function requirePrincipal(
  roles?: readonly Role[],
): Promise<Principal> {
  const user = await getCurrentPrincipal();
  if (!user) throw new AppError("UNAUTHORIZED", "请先登录", 401);
  if (roles && !roles.includes(user.role))
    throw new AppError("FORBIDDEN", "没有执行此操作的权限", 403);
  return user;
}
