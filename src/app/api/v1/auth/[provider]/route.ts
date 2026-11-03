import { defineRoute } from "@/server/http/route";
import { notFoundError } from "@/server/http/errors";
import { enforceRateLimit } from "@/server/http/rate-limit";
import {
  parseOAuthProviderId,
  safeReturnPath,
} from "@/modules/identity/domain/oauth";
import {
  buildAuthorizeUrl,
  newOAuthState,
  requireOAuthClient,
  writeOAuthState,
} from "@/modules/identity/server";

/**
 * 发起第三方登录：写入一次性 state cookie（含返回地址）后跳转授权页。
 * GET /api/v1/auth/:provider?returnTo=/zh-CN/...
 */
export const GET = defineRoute<{ provider: string }>(
  async (request, { params }) => {
    await enforceRateLimit(request, "oauth-start", 20, 600);
    const { provider: rawProvider } = await params;
    const provider = parseOAuthProviderId(rawProvider);
    if (!provider) throw notFoundError();
    const returnTo = safeReturnPath(
      new URL(request.url).searchParams.get("returnTo"),
    );
    const client = requireOAuthClient(provider);
    const state = newOAuthState();
    await writeOAuthState({ state, provider, returnTo });
    return new Response(null, {
      status: 302,
      headers: {
        Location: buildAuthorizeUrl(provider, client, state),
        "Cache-Control": "no-store",
      },
    });
  },
);
