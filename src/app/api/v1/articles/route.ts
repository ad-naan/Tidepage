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
import { isUndefinedColumn } from "@/server/db/client";
import { AppError } from "@/server/http/errors";
export const GET = createArticleReadRoutes({ getArticle, listArticles }).list;

export const POST = defineRoute(async (request, { requestId }) => {
  requireSameOrigin(request);
  const user = await requirePrincipal(["author", "admin"]);
  await enforceAccountRateLimit(user.id, "publish-article", 20, 60);
  const article = await publishArticle(
    user.id,
    await boundedJson(request, 2048),
  ).catch((error: unknown) => {
    if (isUndefinedColumn(error))
      throw new AppError(
        "PUBLICATION_SCHEMA_REQUIRED",
        "Article publication needs a database migration",
        503,
      );
    throw error;
  });
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
