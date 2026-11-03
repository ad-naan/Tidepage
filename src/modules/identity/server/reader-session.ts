import "server-only";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import {
  identitiesTable,
  usersTable,
} from "@/modules/identity/infrastructure/schema";
import type { Principal } from "@/modules/identity/domain/principal";
import type { OAuthProfile } from "@/modules/identity/domain/oauth";
import { issueSession } from "./session";

const identityOf = (profile: OAuthProfile) =>
  and(
    eq(identitiesTable.provider, profile.provider),
    eq(identitiesTable.providerAccountId, profile.providerAccountId),
  );

/**
 * 用第三方身份登录：已绑定的用户更新展示信息后续签会话；
 * 新用户建立 reader 账号并绑定身份。并发首次登录靠唯一索引兜底。
 */
export async function loginWithOAuth(
  profile: OAuthProfile,
): Promise<Principal> {
  const db = getDb();
  const [existing] = await db
    .select({ userId: identitiesTable.userId })
    .from(identitiesTable)
    .where(identityOf(profile))
    .limit(1);
  if (existing) {
    await db
      .update(usersTable)
      .set({
        displayName: profile.displayName,
        ...(profile.email ? { email: profile.email } : {}),
      })
      .where(eq(usersTable.id, existing.userId));
    await db
      .update(identitiesTable)
      .set({
        profileName: profile.displayName,
        profileAvatarUrl: profile.avatarUrl,
        updatedAt: new Date(),
      })
      .where(identityOf(profile));
    await issueSession(existing.userId);
    const [user] = await db
      .select({
        id: usersTable.id,
        displayName: usersTable.displayName,
        role: usersTable.role,
      })
      .from(usersTable)
      .where(eq(usersTable.id, existing.userId))
      .limit(1);
    return user;
  }
  try {
    const [user] = await db
      .insert(usersTable)
      .values({
        displayName: profile.displayName,
        email: profile.email,
        role: "reader",
      })
      .returning({
        id: usersTable.id,
        displayName: usersTable.displayName,
        role: usersTable.role,
      });
    await db.insert(identitiesTable).values({
      userId: user.id,
      provider: profile.provider,
      providerAccountId: profile.providerAccountId,
      profileName: profile.displayName,
      profileAvatarUrl: profile.avatarUrl,
    });
    await issueSession(user.id);
    return user;
  } catch (error) {
    // 并发首次登录时唯一索引冲突：回读已建立的绑定并继续登录。
    const [again] = await db
      .select({ userId: identitiesTable.userId })
      .from(identitiesTable)
      .where(identityOf(profile))
      .limit(1);
    if (!again) throw error;
    await issueSession(again.userId);
    const [user] = await db
      .select({
        id: usersTable.id,
        displayName: usersTable.displayName,
        role: usersTable.role,
      })
      .from(usersTable)
      .where(eq(usersTable.id, again.userId))
      .limit(1);
    return user;
  }
}
