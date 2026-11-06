import { defineRoute } from "@/server/http/route";
import { enforceRateLimit } from "@/server/http/rate-limit";
import { log } from "@/server/observability/logger";
import {
  parseOAuthProviderId,
  safeReturnPath,
  oauthFailurePath,
} from "@/modules/identity/domain/oauth";
import {
  clearOAuthState,
  fetchOAuthProfile,
  loginWithOAuth,
  readOAuthState,
  requireOAuthClient,
  sameOAuthState,
} from "@/modules/identity/server";

/** 登录失败统一回到返回地址并带 login=error，由登录弹窗提示。 */
function failureRedirect(returnTo: string) {
  return new Response(null, {
    status: 303,
    headers: {
      Location: oauthFailurePath(returnTo),
      "Cache-Control": "no-store",
    },
  });
}

/**
 * 第三方授权回调：校验 state cookie 后换令牌、读取资料并签发读者会话。
 * GET /api/v1/auth/:provider/callback?code=...&state=...
 */
export const GET = defineRoute<{ provider: string }>(
  async (request, { params }) => {
    await enforceRateLimit(request, "oauth-callback", 20, 600);
    const { provider: rawProvider } = await params;
    const provider = parseOAuthProviderId(rawProvider);
    const stored = await readOAuthState();
    await clearOAuthState();
    const returnTo = safeReturnPath(stored?.returnTo ?? "/");
    if (!provider) return failureRedirect("/");
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    if (
      !code ||
      !stored ||
      stored.provider !== provider ||
      !sameOAuthState(stored.state, state)
    )
      return failureRedirect(returnTo);
    try {
      const client = requireOAuthClient(provider);
      const profile = await fetchOAuthProfile(provider, client, code);
      await loginWithOAuth(profile);
      log("info", "oauth.login_succeeded", { component: provider });
      return new Response(null, {
        status: 303,
        headers: { Location: returnTo, "Cache-Control": "no-store" },
      });
    } catch (error) {
      log(
        error instanceof Error && error.message.includes("database")
          ? "error"
          : "info",
        "oauth.login_failed",
        { component: provider },
      );
      return failureRedirect(returnTo);
    }
  },
);
