import { getLocale, getTranslations } from "next-intl/server";
import { ArrowUpRight } from "lucide-react";
import { getSitePage } from "@/modules/site-settings/server";
import {
  AuthorNameText,
  AuthorSignature,
} from "@/modules/identity/ui/AuthorSignature";
import { Link } from "@/shared/i18n/navigation";
import styles from "./SiteAboutView.module.css";
import { siteAssets } from "@/shared/config/assets";
import { RichText } from "../rich-text/RichText";
import { MediaImage } from "@/shared/ui/image/MediaImage";
import { getReadingImageDimensions } from "@/modules/content/server/reading-image-dimensions";

export async function SiteAboutView() {
  const locale = await getLocale();
  const [page, t] = await Promise.all([
    getSitePage(locale),
    getTranslations("siteAbout"),
  ]);
  const imageDimensions = await getReadingImageDimensions([page.body]);
  const stops = ["articles", "notes", "projects", "gallery"] as const;
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <p>{t("eyebrow")}</p>
        <h1>{page.title}</h1>
        <div>
          <AuthorNameText text={page.intro} />
        </div>
      </header>
      <div className={styles.layout}>
        <article className={styles.story}>
          {page.body && (
            <RichText document={page.body} imageDimensions={imageDimensions} />
          )}
          <div className={styles.signature}>
            <AuthorSignature size="md" />
            <Link href="/about">
              {t("meetAuthor")}
              <ArrowUpRight size={14} aria-hidden="true" />
            </Link>
          </div>
        </article>
        <aside className={styles.guide}>
          <MediaImage
            src={siteAssets.siteIcon}
            width={88}
            height={88}
            alt={t("mascotAlt")}
          />
          <h2>{t("guideTitle")}</h2>
          {stops.map((stop) => (
            <Link key={stop} href={`/${stop}`}>
              <span>{t(`stops.${stop}.name`)}</span>
              <small>{t(`stops.${stop}.description`)}</small>
              <ArrowUpRight size={12} aria-hidden="true" />
            </Link>
          ))}
        </aside>
      </div>
    </div>
  );
}
