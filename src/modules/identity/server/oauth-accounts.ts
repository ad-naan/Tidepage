import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { getDb, type Database } from "@/server/db/client";
import { identitiesTable, usersTable } from "../infrastructure/schema";
import type { OAuthProfile } from "../domain/oauth";
import type { Principal } from "../domain/principal";

const principalColumns = {
  id: usersTable.id,
  displayName: usersTable.displayName,
  role: usersTable.role,
};
const identityOf = (
  profile: Pick<OAuthProfile, "provider" | "providerAccountId">,
) =>
  and(
    eq(identitiesTable.provider, profile.provider),
    eq(identitiesTable.providerAccountId, profile.providerAccountId),
  );

/** Identity IDs, never names or email addresses, determine account ownership. */
export async function resolveOAuthAccount(
  profile: OAuthProfile,
  db: Database = getDb(),
): Promise<Principal> {
  const resolve = () =>
    db.transaction(async (tx) => {
      const [existing] = await tx
        .select(principalColumns)
        .from(identitiesTable)
        .innerJoin(usersTable, eq(identitiesTable.userId, usersTable.id))
        .where(identityOf(profile))
        .limit(1);
      if (existing) {
        await tx
          .update(identitiesTable)
          .set({
            profileName: profile.displayName,
            profileAvatarUrl: profile.avatarUrl,
            updatedAt: new Date(),
          })
          .where(identityOf(profile));
        // Keep the site's configured author name when either provider is used.
        if (existing.role === "reader") {
          await tx
            .update(usersTable)
            .set({ displayName: profile.displayName })
            .where(eq(usersTable.id, existing.id));
          existing.displayName = profile.displayName;
        }
        return existing;
      }
      const [user] = await tx
        .insert(usersTable)
        .values({ displayName: profile.displayName, role: "reader" })
        .returning(principalColumns);
      await tx.insert(identitiesTable).values({
        userId: user.id,
        provider: profile.provider,
        providerAccountId: profile.providerAccountId,
        profileName: profile.displayName,
        profileAvatarUrl: profile.avatarUrl,
      });
      return user;
    });
  try {
    return await resolve();
  } catch (error) {
    const cause = error as { code?: string; cause?: { code?: string } };
    if ((cause.cause?.code ?? cause.code) !== "23505") throw error;
    // The losing first-login transaction rolls back its user as well as its identity.
    return resolve();
  }
}

/** Local operator command only. Preserve the existing owner and all content FKs. */
export async function bindOwnerIdentities(
  profiles: readonly OAuthProfile[],
  userId?: string,
  db: Database = getDb(),
): Promise<Principal> {
  if (!profiles.length) throw new Error("Specify at least one owner identity.");
  return db.transaction(async (tx) => {
    await tx.execute(
      sql`LOCK TABLE users, identities IN SHARE ROW EXCLUSIVE MODE`,
    );
    const admins = await tx
      .select(principalColumns)
      .from(usersTable)
      .where(eq(usersTable.role, "admin"));
    if (!userId && admins.length > 1)
      throw new Error(
        "Multiple administrators exist; select --user-id explicitly.",
      );
    let owner = userId
      ? (
          await tx
            .select(principalColumns)
            .from(usersTable)
            .where(eq(usersTable.id, userId))
        )[0]
      : admins[0];
    if (userId && !owner) throw new Error("The selected owner does not exist.");
    for (const profile of profiles) {
      const [bound] = await tx
        .select(principalColumns)
        .from(identitiesTable)
        .innerJoin(usersTable, eq(identitiesTable.userId, usersTable.id))
        .where(identityOf(profile));
      if (bound && owner && bound.id !== owner.id)
        throw new Error(
          "Identity already belongs to another user; no accounts were merged or reassigned.",
        );
      owner ??= bound;
    }
    if (!owner)
      [owner] = await tx
        .insert(usersTable)
        .values({ displayName: profiles[0].displayName, role: "admin" })
        .returning(principalColumns);
    await tx
      .update(usersTable)
      .set({ role: "admin" })
      .where(eq(usersTable.id, owner.id));
    for (const profile of profiles) {
      await tx
        .insert(identitiesTable)
        .values({
          userId: owner.id,
          provider: profile.provider,
          providerAccountId: profile.providerAccountId,
          profileName: profile.displayName,
          profileAvatarUrl: profile.avatarUrl,
        })
        .onConflictDoNothing();
    }
    return { ...owner, role: "admin" };
  });
}
