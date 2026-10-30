import { localeSchema } from "@/shared/i18n/schema";
import { getArticle } from "@/modules/content/server";
import { articleMarkdown } from "@/modules/content/server";
import { localizedUrl } from "@/server/seo/metadata";
import { getEnv } from "@/server/config/env";
import { slugSchema } from "@/modules/content/domain/models";
import { getCatalog } from "@/server/i18n/messages";
export const dynamic = "force-dynamic";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string; locale: string }> },
) {
  const {slug,locale:language}=await params;
  const locale=localeSchema.parse(language);
  const messages = await getCatalog(locale);
  const parsed = slugSchema.safeParse(slug);
  const article = parsed.success ? await getArticle(parsed.data,locale) : null;
  if (!article) return new Response(messages.markdown.notFound, {
    status: 404,
    headers: { "Content-Type": "text/plain; charset=utf-8", "Content-Language": locale, "Cache-Control": "no-store" },
  });
  const canonical = localizedUrl(locale,`/articles/${article.slug}`);
  return new Response(articleMarkdown(article, canonical, messages.markdown), {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Language": locale,
      "Cache-Control": "no-store",
      Link: `<${canonical}>; rel="canonical"`,
      "X-Robots-Tag": getEnv().INDEXING_ENABLED ? "index, follow" : "noindex",
    },
  });
}
