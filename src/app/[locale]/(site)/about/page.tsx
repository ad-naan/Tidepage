import { RoomHeading } from "@/components/RoomHeading";
import styles from "@/components/rooms.module.css";
import { getPageMetadata } from "@/server/seo/metadata";
import { Link } from "@/shared/i18n/navigation";
import { ArrowRight } from "lucide-react";

import { MiniSketch } from "@/components/Sketch";
import { profile } from "@/shared/config/profile";
import { getTranslations } from "next-intl/server";

export const generateMetadata = () => getPageMetadata("/about");
export default async function Page() {
  const t = await getTranslations("about");
  const sections = t.raw("sections") as typeof profile.about;
  return (
    <div className={`inner-page memoir-page ${styles.about}`}>
      <RoomHeading
        room="about"
        title={t("title")}
        description={t("description")}
      />
      <div className="memoir-byline">
        <span className="memoir-avatar">a</span>
        <div>
          <strong>{profile.name}</strong>
          <span>{t("byline")}</span>
        </div>
        <span className="memoir-status">
          <span className="live-dot" />
          {t("status")}
        </span>
      </div>
      <div className="memoir-layout">
        <article className="memoir-text">
          {sections.map((section, i) => (
            <section id={`memoir-${i}`} key={section.title}>
              <h2>{section.title}</h2>
              {section.paragraphs.map((p) => (
                <p key={p}>{p}</p>
              ))}
            </section>
          ))}
          <div className="memoir-signature">
            <p>{t("signature")}</p>
            <span>adnaan</span>
          </div>
        </article>
        <aside className="memoir-margin">
          <span className="memoir-margin-label">{t("marginLabel")}</span>
          {sections.map((section, i) => (
            <a href={`#memoir-${i}`} key={section.title}>
              {section.title}
            </a>
          ))}
          <MiniSketch kind="tree" />
          <p>
            {t("motto1")}
            <br />
            {t("motto2")}
          </p>
        </aside>
      </div>
      <div className="memoir-next">
        <div>
          <span>{t("nextLabel")}</span>
          <p>{t("nextText")}</p>
        </div>
        <Link href="/notes">
          {t("nextLink")} <ArrowRight size={17} />
        </Link>
      </div>
    </div>
  );
}
