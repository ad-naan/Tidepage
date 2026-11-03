import "server-only";
import { getEnv } from "@/server/config/env";
import { AppError } from "@/server/http/errors";
import { log } from "@/server/observability/logger";
import {
  buildAuthorizeUrl,
  type OAuthClient,
  type OAuthProfile,
  type OAuthProviderId,
} from "../domain/oauth";

export { buildAuthorizeUrl };

const providerEnvKey = {
  github: "OAUTH_GITHUB",
  gitee: "OAUTH_GITEE",
} as const satisfies Record<OAuthProviderId, string>;

/** 已配置密钥的平台列表；未配置的平台不出现在登录界面。 */
export function listConfiguredOAuthProviders(): OAuthProviderId[] {
  const env = getEnv();
  return (Object.keys(providerEnvKey) as OAuthProviderId[]).filter((provider) =>
    Boolean(env[`${providerEnvKey[provider]}_CLIENT_ID`]),
  );
}

export function requireOAuthClient(provider: OAuthProviderId): OAuthClient {
  const env = getEnv();
  const clientId = env[`${providerEnvKey[provider]}_CLIENT_ID`];
  const clientSecret = env[`${providerEnvKey[provider]}_CLIENT_SECRET`];
  if (!clientId || !clientSecret)
    throw new AppError("OAUTH_NOT_CONFIGURED", "该登录方式尚未配置", 503);
  return {
    clientId,
    clientSecret,
    redirectUri: `${new URL(env.SITE_URL).origin}/api/v1/auth/${provider}/callback`,
  };
}

async function postJson(
  provider: OAuthProviderId,
  url: string,
  body: Record<string, string>,
) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(8000),
  });
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok)
    // 日志字段走白名单：provider 记入 component，避免结构漂移与敏感信息外泄。
    log("info", "oauth.token_failed", {
      component: provider,
      status: response.status,
    });
  return payload as Record<string, unknown> | null;
}

function readAccessToken(payload: Record<string, unknown> | null): string {
  const token = payload?.access_token;
  if (typeof token !== "string" || token.length === 0)
    throw new AppError("OAUTH_EXCHANGE_FAILED", "第三方授权失败", 502);
  return token;
}

function str(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

async function githubProfile(client: OAuthClient, code: string) {
  const token = readAccessToken(
    await postJson("github", "https://github.com/login/oauth/access_token", {
      client_id: client.clientId,
      client_secret: client.clientSecret,
      code,
      redirect_uri: client.redirectUri,
    }),
  );
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "User-Agent": "tidepage",
  };
  const userResponse = await fetch("https://api.github.com/user", {
    headers,
    signal: AbortSignal.timeout(8000),
  });
  const user = (await userResponse.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;
  let email = str(user?.email);
  if (!email) {
    const emails = await fetch("https://api.github.com/user/emails", {
      headers,
      signal: AbortSignal.timeout(8000),
    })
      .then(
        (r) => r.json() as Promise<unknown>,
        () => null,
      )
      .catch(() => null);
    if (Array.isArray(emails))
      email = str(
        emails.find(
          (item): item is { email: string } =>
            !!item &&
            typeof item === "object" &&
            (item as { primary?: unknown }).primary === true &&
            typeof (item as { email?: unknown }).email === "string",
        )?.email,
      );
  }
  return {
    providerAccountId: String(user?.id ?? ""),
    displayName: str(user?.name) ?? str(user?.login) ?? "",
    email,
    avatarUrl: str(user?.avatar_url),
    profileUrl: str(user?.html_url),
  };
}

async function giteeProfile(client: OAuthClient, code: string) {
  const token = readAccessToken(
    await postJson("gitee", "https://gitee.com/oauth/token", {
      grant_type: "authorization_code",
      client_id: client.clientId,
      client_secret: client.clientSecret,
      code,
      redirect_uri: client.redirectUri,
    }),
  );
  const userResponse = await fetch(
    `https://gitee.com/api/v5/user?access_token=${encodeURIComponent(token)}`,
    { signal: AbortSignal.timeout(8000) },
  );
  const user = (await userResponse.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;
  return {
    providerAccountId: String(user?.id ?? ""),
    displayName: str(user?.name) ?? str(user?.login) ?? "",
    email: str(user?.email),
    avatarUrl: str(user?.avatar_url),
    profileUrl: str(user?.html_url),
  };
}

/** 用授权码换取访问令牌并读取公开资料，统一转换为 OAuthProfile。 */
export async function fetchOAuthProfile(
  provider: OAuthProviderId,
  client: OAuthClient,
  code: string,
): Promise<OAuthProfile> {
  const raw =
    provider === "github"
      ? await githubProfile(client, code)
      : await giteeProfile(client, code);
  if (!raw.providerAccountId || !raw.displayName)
    throw new AppError("OAUTH_PROFILE_INVALID", "无法读取账号资料", 502);
  return { provider, ...raw, email: raw.email ?? null };
}
