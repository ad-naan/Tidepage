import { feedPath } from "@/shared/config/site";
import { getArticles } from "@/modules/content/server";
import { absoluteUrl, localizedUrl } from "@/server/seo/metadata";
import { getCatalog } from "@/server/i18n/messages";
import { getPublicSiteIdentity } from "@/modules/site-settings/server";
import { defineRoute } from "@/server/http/route";
import { localeQuerySchema } from "@/shared/i18n/schema";
export const dynamic = "force-dynamic";
export const GET = defineRoute(async (request) => {
  const locale = localeQuerySchema.parse(
    new URL(request.url).searchParams.get("locale") ?? undefined,
  );
  const [articles, messages, identity] = await Promise.all([
    getArticles(locale),
    getCatalog(locale),
    getPublicSiteIdentity(locale),
  ]);
  const text = `# ${identity.name}\n\n> ${identity.description}\n\n## ${messages.llms.site}\n\n- [${messages.llms.aboutAuthor}](${localizedUrl(locale, "/about")})\n- [${messages.llms.rss}](${absoluteUrl(feedPath(locale))})\n\n## ${messages.llms.articles}\n\n${articles.map((a) => `- [${a.title.replace(/[\[\]\\]/g, "\\$&")}](${localizedUrl(locale, `/articles/${a.slug}/text`)}): ${a.excerpt}`).join("\n")}\n`;
  return new Response(text, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Language": locale,
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex",
    },
  });
});
