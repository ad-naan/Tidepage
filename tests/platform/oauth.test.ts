import { test } from "node:test";
import assert from "node:assert/strict";
import { eq } from "drizzle-orm";
import { createContentTestStore } from "../fixtures/content";
import type { Database } from "../../src/server/db/client";
import { parseEnv } from "../../src/server/config/env-schema";
import {
  buildAuthorizeUrl,
  safeReturnPath,
  oauthFailurePath,
  parseOAuthProviderId,
  type OAuthProfile,
} from "../../src/modules/identity/domain/oauth";
import { fetchOAuthProfile } from "../../src/modules/identity/server/oauth";
import {
  bindOwnerIdentities,
  resolveOAuthAccount,
} from "../../src/modules/identity/server/oauth-accounts";
import {
  identitiesTable,
  usersTable,
} from "../../src/modules/identity/infrastructure/schema";

const client = {
  clientId: "app-id",
  clientSecret: "private-client-secret",
  redirectUri: "http://localhost:3000/api/v1/auth/github/callback",
};
const profile = (provider: "github" | "gitee", id: string): OAuthProfile => ({
  provider,
  providerAccountId: id,
  displayName: "adnaan",
  avatarUrl: null,
  profileUrl: null,
});

test("OAuth configuration allows disabled providers but rejects half-configured credentials", () => {
  const base = { DATABASE_URL: "postgresql://user:password@localhost/blog" };
  assert.equal(
    parseEnv({
      ...base,
      OAUTH_GITHUB_CLIENT_ID: "",
      OAUTH_GITHUB_CLIENT_SECRET: "",
    }).OAUTH_GITHUB_CLIENT_ID,
    undefined,
  );
  assert.throws(
    () => parseEnv({ ...base, OAUTH_GITEE_CLIENT_ID: "id" }),
    /configured together/,
  );
  assert.equal(
    parseEnv({
      ...base,
      OAUTH_GITHUB_CLIENT_ID: "id",
      OAUTH_GITHUB_CLIENT_SECRET: "client-secret",
    }).OAUTH_GITHUB_CLIENT_ID,
    "id",
  );
});

test("authorization uses minimum scopes and rejects unsafe return paths", () => {
  assert.equal(parseOAuthProviderId("unknown"), null);
  for (const value of [
    undefined,
    "https://evil.test",
    "//evil.test",
    "/\\evil.test",
    "/\n/evil.test",
    "/\t/evil.test",
    "/" + "x".repeat(513),
  ])
    assert.equal(safeReturnPath(value), "/");
  assert.equal(
    safeReturnPath("/en/admin/articles/new?draft=1"),
    "/en/admin/articles/new?draft=1",
  );
  assert.equal(
    oauthFailurePath("/en/admin?draft=1#editor"),
    "/en/admin?draft=1&login=error#editor",
  );
  for (const provider of ["github", "gitee"] as const) {
    const url = new URL(
      buildAuthorizeUrl(provider, client, "unguessable-state"),
    );
    assert.equal(url.searchParams.get("state"), "unguessable-state");
    assert.equal(url.searchParams.get("redirect_uri"), client.redirectUri);
    assert.equal(
      url.searchParams.get("scope"),
      provider === "github" ? "read:user" : "user_info",
    );
    assert.equal(url.toString().includes(client.clientSecret), false);
  }
});

test("both providers exchange form-encoded codes and reject failed or malformed profile responses", async () => {
  for (const provider of ["github", "gitee"] as const) {
    let calls = 0;
    const mockFetch = (async (
      _url: string | URL | Request,
      init?: RequestInit,
    ) => {
      calls++;
      if (calls === 1) {
        assert.equal(
          new Headers(init?.headers).get("content-type"),
          "application/x-www-form-urlencoded",
        );
        assert.ok(init?.body instanceof URLSearchParams);
        assert.equal(init.body.get("code"), "one-time-code");
        return Response.json({ access_token: "private-access-token" });
      }
      return Response.json({ id: 42, login: "owner", name: "Owner" });
    }) as typeof fetch;
    assert.equal(
      (await fetchOAuthProfile(provider, client, "one-time-code", mockFetch))
        .providerAccountId,
      "42",
    );
    assert.equal(calls, 2);
    const failed = (async () =>
      Response.json(
        { access_token: "unexpected" },
        { status: 401 },
      )) as typeof fetch;
    await assert.rejects(fetchOAuthProfile(provider, client, "code", failed), {
      code: "OAUTH_EXCHANGE_FAILED",
    });
    for (const id of [{}, 0, "", -1]) {
      let attempt = 0;
      const invalid = (async () =>
        ++attempt === 1
          ? Response.json({ access_token: "token" })
          : Response.json({ id, name: "Owner" })) as typeof fetch;
      await assert.rejects(
        fetchOAuthProfile(provider, client, "code", invalid),
        { code: "OAUTH_PROFILE_INVALID" },
      );
    }
    let attempt = 0;
    const forbidden = (async () =>
      ++attempt === 1
        ? Response.json({ access_token: "token" })
        : Response.json(
            { id: 42, name: "Owner" },
            { status: 403 },
          )) as typeof fetch;
    await assert.rejects(
      fetchOAuthProfile(provider, client, "code", forbidden),
      { code: "OAUTH_PROFILE_INVALID" },
    );
  }
});

test("GitHub and Gitee bind to the existing owner; readers cannot claim ownership by matching a name", async () => {
  const fixture = await createContentTestStore();
  const db = fixture.db as unknown as Database;
  try {
    const [owner] = await db
      .insert(usersTable)
      .values({ displayName: "Original author", role: "admin" })
      .returning();
    const github = profile("github", "163977012"),
      gitee = profile("gitee", "5352827");
    assert.equal(
      (await bindOwnerIdentities([github, gitee], undefined, db)).id,
      owner.id,
    );
    assert.equal(
      (await bindOwnerIdentities([github, gitee], undefined, db)).id,
      owner.id,
    );
    for (const p of [github, gitee]) {
      const user = await resolveOAuthAccount(p, db);
      assert.deepEqual(user, {
        id: owner.id,
        displayName: "Original author",
        role: "admin",
      });
    }
    const readerProfile = profile("github", "123");
    const reader = await resolveOAuthAccount(readerProfile, db);
    assert.equal(reader.role, "reader");
    assert.notEqual(reader.id, owner.id);
    const results = await Promise.all([
      resolveOAuthAccount(profile("gitee", "456"), db),
      resolveOAuthAccount(profile("gitee", "456"), db),
    ]);
    assert.equal(results[0].id, results[1].id);
    assert.equal((await db.select().from(usersTable)).length, 3);
    await assert.rejects(
      bindOwnerIdentities(
        [profile("gitee", "789"), readerProfile],
        owner.id,
        db,
      ),
      /another user/,
    );
    assert.equal(
      (
        await db
          .select()
          .from(identitiesTable)
          .where(eq(identitiesTable.providerAccountId, "789"))
      ).length,
      0,
    );
    assert.equal((await resolveOAuthAccount(readerProfile, db)).role, "reader");
  } finally {
    await fixture.close();
  }
});
