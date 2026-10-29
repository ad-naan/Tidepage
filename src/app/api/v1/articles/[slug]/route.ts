import { localeQuerySchema } from "@/shared/i18n/schema";
import { getArticle } from "@/modules/content/server";
import { defineRoute, jsonData } from "@/server/http/route";
import { notFoundError } from "@/server/http/errors";
export const GET = defineRoute<{ slug: string }>(
  async (request, { params, requestId }) => {
    const article = await getArticle((await params).slug, localeQuerySchema.parse(new URL(request.url).searchParams.get("locale") ?? undefined));
    if (!article) throw notFoundError();
    return jsonData(article, requestId);
  },
);
