import {
  getArticles,
  articleFeedItem,
  escapeXml,
  renderArticleFeedItem,
} from "@/modules/content/server";
import { localizedUrl } from "@/server/seo/metadata";
import { getPublicSiteIdentity } from "@/modules/site-settings/server";
import { defineRoute } from "@/server/http/route";
import { localeQuerySchema } from "@/shared/i18n/schema";
export const dynamic = "force-dynamic";
export const GET = defineRoute(async (request) => {
  const locale = localeQuerySchema.parse(
    new URL(request.url).searchParams.get("locale") ?? undefined,
  );
  const [articles, identity] = await Promise.all([
    getArticles(locale),
    getPublicSiteIdentity(locale),
  ]);
  const origin = escapeXml(localizedUrl(locale, "/"));
  const items = articles
    .map((article) =>
      renderArticleFeedItem(
        articleFeedItem(
          article,
          localizedUrl(locale, `/articles/${article.slug}`),
        ),
      ),
    )
    .join("");
  const xml = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>${escapeXml(identity.title)}</title><link>${origin}</link><description>${escapeXml(identity.description)}</description><language>${locale}</language>${items}</channel></rss>`;
  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Content-Language": locale,
      "Cache-Control": "no-store",
    },
  });
});
