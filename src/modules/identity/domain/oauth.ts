export type OAuthProviderId = "github" | "gitee";

export const oauthProviderIds: readonly OAuthProviderId[] = ["github", "gitee"];

export function parseOAuthProviderId(value: string): OAuthProviderId | null {
  return (oauthProviderIds as readonly string[]).includes(value)
    ? (value as OAuthProviderId)
    : null;
}

/**
 * 第三方平台返回并标准化后的账号信息。
 * providerAccountId 统一为字符串，避免各平台数字 / 字符串 id 混用。
 */
export type OAuthProfile = {
  provider: OAuthProviderId;
  providerAccountId: string;
  displayName: string;
  avatarUrl: string | null;
  profileUrl: string | null;
};

export type OAuthClient = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
};

/** 纯函数：构造各平台的授权跳转地址，便于独立测试。 */
export function buildAuthorizeUrl(
  provider: OAuthProviderId,
  client: Pick<OAuthClient, "clientId" | "redirectUri">,
  state: string,
): string {
  const url =
    provider === "github"
      ? new URL("https://github.com/login/oauth/authorize")
      : new URL("https://gitee.com/oauth/authorize");
  url.searchParams.set("client_id", client.clientId);
  url.searchParams.set("redirect_uri", client.redirectUri);
  url.searchParams.set("state", state);
  if (provider === "github") {
    url.searchParams.set("scope", "read:user");
  } else {
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", "user_info");
  }
  return url.toString();
}

/**
 * 只接受站内路径作为登录后的返回地址，拒绝协议相对地址与外站跳转。
 */
export function safeReturnPath(value: string | null | undefined): string {
  if (
    !value ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\") ||
    /[\u0000-\u0020\u007f]/.test(value) ||
    value.length > 512
  )
    return "/";
  return value;
}

export function oauthFailurePath(returnTo: string): string {
  const url = new URL(safeReturnPath(returnTo), "https://return.invalid");
  url.searchParams.set("login", "error");
  return url.pathname + url.search + url.hash;
}
