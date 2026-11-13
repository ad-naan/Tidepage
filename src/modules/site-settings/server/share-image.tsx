import "server-only";
import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { SocialPreview } from "@/modules/site-settings/ui/SocialPreview";
import { siteAssets } from "@/shared/config/assets";
import { profile } from "@/shared/config/profile";
import { formatDate } from "@/shared/lib/date-time";
import { getCatalog } from "@/server/i18n/messages";
import type { Locale } from "@/shared/i18n/config";
import type { SiteIdentity } from "@/modules/site-settings/domain/identity";
import type { Article } from "@/modules/content/domain/models";

export const shareImageSize = { width: 1200, height: 630 };

const artwork = Promise.all([
  readFile(join(process.cwd(), "public", siteAssets.signature)),
  readFile(join(process.cwd(), "public", siteAssets.heroOtterStill)),
  readFile(join(process.cwd(), "src/server/seo/assets/noto-serif-sc-500.woff")),
]);

export async function createShareImage({
  locale,
  identity,
  article,
}: {
  locale: Locale;
  identity?: SiteIdentity;
  article?: Pick<Article, "title" | "date" | "category">;
}) {
  const [catalog, [signature, otter, font]] = await Promise.all([
    getCatalog(locale),
    artwork,
  ]);
  const name = identity?.name ?? catalog.site.name;
  return new ImageResponse(
    <SocialPreview
      name={name}
      title={article?.title ?? name}
      description={
        article
          ? `${catalog.categories[article.category]} / ${formatDate(article.date, locale)}`
          : catalog.site.shareDescription
      }
      byline={catalog.site.shareByline.replace("{author}", profile.name)}
      signature={`data:image/png;base64,${signature.toString("base64")}`}
      otter={`data:image/png;base64,${otter.toString("base64")}`}
      article={Boolean(article)}
    />,
    {
      ...shareImageSize,
      fonts: [
        { name: "Noto Serif SC", data: font, weight: 500, style: "normal" },
      ],
      headers: {
        "Cache-Control":
          "public, max-age=0, s-maxage=60, stale-while-revalidate=300",
      },
    },
  );
}
