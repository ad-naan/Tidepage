import "server-only";
import type { createContentService } from "@/modules/content/application/service";
import { localeQuerySchema } from "@/shared/i18n/schema";
import { defineRoute, jsonData } from "@/server/http/route";
import { notFoundError } from "@/server/http/errors";

type ContentReads = ReturnType<typeof createContentService>;
export function createArticleReadRoutes(reads: {
  listArticles: ContentReads["listArticles"];
  getArticle: ContentReads["articleBySlug"];
}) {
  return {
    list: defineRoute(async (request, { requestId }) => {
      const query = Object.fromEntries(new URL(request.url).searchParams);
      return jsonData(await reads.listArticles(query), requestId);
    }),
    detail: defineRoute<{ slug: string }>(
      async (request, { params, requestId }) => {
        const article = await reads.getArticle(
          (await params).slug,
          localeQuerySchema.parse(
            new URL(request.url).searchParams.get("locale") ?? undefined,
          ),
        );
        if (!article) throw notFoundError();
        return jsonData(article, requestId);
      },
    ),
  };
}
