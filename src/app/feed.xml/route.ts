import { getArticles } from "@/modules/content/server";
import { absoluteUrl } from "@/server/seo/metadata";
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
export async function GET() {
  const articles = await getArticles();
  const origin = absoluteUrl("/").replace(/\/$/, "");
  const xml = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>adnaan · 数字花园</title><link>${escapeXml(origin)}</link><description>关于技术、产品与生活的手记</description><language>zh-cn</language>${articles.map((a) => `<item><title>${escapeXml(a.title)}</title><link>${escapeXml(origin)}/articles/${a.slug}</link><guid>${escapeXml(origin)}/articles/${a.slug}</guid><description>${escapeXml(a.excerpt)}</description><pubDate>${new Date(a.date).toUTCString()}</pubDate></item>`).join("")}</channel></rss>`;
  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
