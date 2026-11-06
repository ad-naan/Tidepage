import { parseArgs } from "node:util";
import { config } from "dotenv";
import { z } from "zod";
import { bindOwnerIdentities } from "../src/modules/identity/server/oauth-accounts";
import { closeDatabase } from "../src/server/db/client";
import type {
  OAuthProfile,
  OAuthProviderId,
} from "../src/modules/identity/domain/oauth";

config({ path: [".env.local", ".env"], quiet: true });
const { values } = parseArgs({
  options: {
    github: { type: "string" },
    gitee: { type: "string" },
    "github-id": { type: "string" },
    "gitee-id": { type: "string" },
    "user-id": { type: "string" },
  },
});

async function publicProfile(
  provider: OAuthProviderId,
  username: string,
): Promise<OAuthProfile> {
  if (!/^[a-zA-Z0-9_-]{1,100}$/.test(username))
    throw new Error(`Invalid ${provider} username.`);
  const base =
    provider === "github"
      ? "https://api.github.com/users/"
      : "https://gitee.com/api/v5/users/";
  const response = await fetch(base + encodeURIComponent(username), {
    headers: {
      Accept: "application/json",
      "User-Agent": "tidepage-admin-setup",
    },
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok)
    throw new Error(`Could not resolve ${provider} user (${response.status}).`);
  const user = z
    .object({
      id: z.number().int().positive(),
      login: z.string(),
      name: z.string().nullable().optional(),
      avatar_url: z.string().nullable().optional(),
      html_url: z.string().nullable().optional(),
    })
    .parse(await response.json());
  if (user.login.toLowerCase() !== username.toLowerCase())
    throw new Error("Provider returned a different account.");
  return {
    provider,
    providerAccountId: String(user.id),
    displayName: user.name || user.login,
    avatarUrl: user.avatar_url ?? null,
    profileUrl: user.html_url ?? null,
  };
}

try {
  if (
    !values.github &&
    !values.gitee &&
    !values["github-id"] &&
    !values["gitee-id"]
  )
    throw new Error(
      "Usage: pnpm admin:setup --github <username> --gitee <username> [--user-id <uuid>] (or --github-id / --gitee-id for verified numeric IDs)",
    );
  const profiles = await Promise.all(
    (["github", "gitee"] as const).flatMap((provider) =>
      values[`${provider}-id`]
        ? [
            Promise.resolve({
              provider,
              providerAccountId: z
                .string()
                .regex(/^[1-9][0-9]*$/)
                .parse(values[`${provider}-id`]),
              displayName: values[provider] ?? "adnaan",
              avatarUrl: null,
              profileUrl: null,
            }),
          ]
        : values[provider]
          ? [publicProfile(provider, values[provider])]
          : [],
    ),
  );
  const owner = await bindOwnerIdentities(
    profiles,
    values["user-id"] ? z.uuid().parse(values["user-id"]) : undefined,
  );
  console.info(
    `Owner ${owner.id}: ${profiles.map((profile) => `${profile.provider}:${profile.providerAccountId}`).join(", ")}. Existing content ownership preserved.`,
  );
} catch (error) {
  console.error(error instanceof Error ? error.message : "Owner setup failed.");
  process.exitCode = 1;
} finally {
  await closeDatabase();
}
