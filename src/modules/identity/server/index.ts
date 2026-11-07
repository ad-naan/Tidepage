import "server-only";
import { AppError } from "@/server/http/errors";
import type { Principal, Role } from "@/modules/identity/domain/principal";
import { getCurrentPrincipal } from "./session";
export { loginWithOAuth } from "./oauth-session";
export { getCurrentPrincipal, revokeCurrentSession } from "./session";
export {
  buildAuthorizeUrl,
  fetchOAuthProfile,
  listConfiguredOAuthProviders,
  requireOAuthClient,
} from "./oauth";
export {
  clearOAuthState,
  newOAuthState,
  readOAuthState,
  sameOAuthState,
  writeOAuthState,
} from "./oauth-state";

export async function requirePrincipal(
  roles?: readonly Role[],
): Promise<Principal> {
  const user = await getCurrentPrincipal();
  if (!user) throw new AppError("UNAUTHORIZED", "请先登录", 401);
  if (roles && !roles.includes(user.role))
    throw new AppError("FORBIDDEN", "没有执行此操作的权限", 403);
  return user;
}
