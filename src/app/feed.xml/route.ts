import { getArticles } from "@/modules/content/server";
import { localizedUrl } from "@/server/seo/metadata";
import { getCatalog } from "@/server/i18n/messages";
import { defineRoute } from "@/server/http/route";
import { localeQuerySchema } from "@/shared/i18n/schema";
export const dynamic = "force-dynamic";
function escapeXml(value: string) {
  return value.replace(
    /[<>&"']/g,
    (c) =>
      ({
        "<": "&lt;",
        ">": "&gt;",
        "&": "&amp;",
        '"': "&quot;",
        "'": "&apos;",
      })[c]!,
  );
}
export const GET = defineRoute(async (request) => {
  const locale = localeQuerySchema.parse(new URL(request.url).searchParams.get("locale") ?? undefined);
  const [articles, messages] = await Promise.all([getArticles(locale), getCatalog(locale)]);
  const origin = escapeXml(localizedUrl(locale, "/"));
  const items = articles.map((article) => {
    const url = escapeXml(localizedUrl(locale, `/articles/${article.slug}`));
    return `<item><title>${escapeXml(article.title)}</title><link>${url}</link><guid>${url}</guid><description>${escapeXml(article.excerpt)}</description><pubDate>${new Date(article.date).toUTCString()}</pubDate></item>`;
  }).join("");
  const xml = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>${escapeXml(messages.feed.title)}</title><link>${origin}</link><description>${escapeXml(messages.feed.description)}</description><language>${locale}</language>${items}</channel></rss>`;
  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Content-Language": locale,
      "Cache-Control": "no-store",
    },
  });
});
