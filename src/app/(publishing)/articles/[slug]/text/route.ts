import { getArticle } from "@/modules/content/server";
import { articleMarkdown } from "@/modules/content/server";
import { absoluteUrl } from "@/server/seo/metadata";
import { getEnv } from "@/server/config/env";
import { slugSchema } from "@/modules/content/domain/models";
export const dynamic = "force-dynamic";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const parsed = slugSchema.safeParse((await params).slug);
  const article = parsed.success ? await getArticle(parsed.data) : null;
  if (!article) return new Response("Not found", { status: 404 });
  const canonical = absoluteUrl(`/articles/${article.slug}`);
  return new Response(articleMarkdown(article, canonical), {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "no-store",
      Link: `<${canonical}>; rel="canonical"`,
      "X-Robots-Tag": getEnv().INDEXING_ENABLED ? "index, follow" : "noindex",
    },
  });
}
