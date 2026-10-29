import { getArticles } from "@/modules/content/server";
import { absoluteUrl } from "@/server/seo/metadata";
import { site } from "@/shared/config/site";
export const dynamic = "force-dynamic";
export async function GET() {
  const articles = await getArticles();
  const text = `# ${site.name}\n\n> ${site.description}\n\n## 站点\n\n- [关于作者](${absoluteUrl("/about")})\n- [订阅 RSS](${absoluteUrl("/feed.xml")})\n\n## 文章\n\n${articles.map((a) => `- [${a.title.replace(/[\[\]\\]/g, "\\$&")}](${absoluteUrl(`/articles/${a.slug}/text`)}): ${a.excerpt}`).join("\n")}\n`;
  return new Response(text, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex",
    },
  });
}
