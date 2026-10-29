import { getArticle } from "@/modules/content/server";
import { defineRoute, jsonData } from "@/server/http/route";
import { notFoundError } from "@/server/http/errors";
export const GET = defineRoute<{ slug: string }>(
  async (_request, { params, requestId }) => {
    const article = await getArticle((await params).slug);
    if (!article) throw notFoundError();
    return jsonData(article, requestId);
  },
);
