import {
  getArticle,
  invalidateContentCache,
  listArticles,
} from "@/modules/content/server";
import { createArticleReadRoutes } from "@/modules/content/server/http";
import { publishArticle } from "@/modules/content/server/publish-article";
import { requirePrincipal } from "@/modules/identity/server";
import { requireSameOrigin } from "@/server/http/origin";
import { boundedJson } from "@/server/http/body";
import { enforceAccountRateLimit } from "@/server/http/rate-limit";
import { defineRoute, jsonData } from "@/server/http/route";
import { log } from "@/server/observability/logger";
export const GET = createArticleReadRoutes({ getArticle, listArticles }).list;

export const POST = defineRoute(async (request, { requestId }) => {
  requireSameOrigin(request);
  const user = await requirePrincipal(["author", "admin"]);
  await enforceAccountRateLimit(user.id, "publish-article", 20, 60);
  const article = await publishArticle(
    user.id,
    await boundedJson(request, 2048),
  );
  try {
    await invalidateContentCache(article.slug, article.locale);
  } catch {
    log("warn", "article.cache_invalidation_failed", {
      requestId,
      component: "cache",
    });
  }
  return jsonData(article, requestId);
});
