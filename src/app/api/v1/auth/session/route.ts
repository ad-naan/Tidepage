import { defineRoute, jsonData } from "@/server/http/route";
import { requireSameOrigin } from "@/server/http/origin";
import { revokeCurrentSession } from "@/modules/identity/server";

/**
 * 注销当前会话。读者与站主共用一个会话 cookie，
 * 在同一浏览器同时登录两者时，注销会一并结束。
 */
export const DELETE = defineRoute(async (request, { requestId }) => {
  requireSameOrigin(request);
  await revokeCurrentSession();
  return jsonData({ authenticated: false }, requestId);
});
