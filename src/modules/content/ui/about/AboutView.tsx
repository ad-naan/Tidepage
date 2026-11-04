import { Anchor } from "@/shared/ui/link/Anchor";
import { PencilLine, CoastGlyph } from "@/shared/ui/drawing/CoastalMarks";
import { HanddrawnMark } from "@/shared/ui/drawing/HanddrawnMark";
import { ContentHeading } from "@/modules/content/ui/layout/ContentHeading";
import styles from "./AboutView.module.css";
import { Link } from "@/shared/i18n/navigation";
import { ArrowRight } from "lucide-react";

import { CoastalVignette } from "@/shared/ui/illustration/CoastalVignette";
import { profile } from "@/shared/config/profile";
import { getTranslations } from "next-intl/server";
import { Discussion } from "@/modules/engagement/ui/Discussion";
import { ContentEngagementActions } from "@/modules/engagement/ui/EngagementActions";

export async function AboutView() {
  const t = await getTranslations("about");
  const sections = t.raw("sections") as Array<{
    title: string;
    paragraphs: string[];
  }>;
  return (
    <div className={`inner-page memoir-page ${styles.about}`}>
      <ContentHeading
        room="about"
        title={t("title")}
        description={t("description")}
      />
      <div className="memoir-byline">
        <span className="memoir-avatar">
          <CoastGlyph kind="leaf" />
        </span>
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
        <PencilLine className="memoir-shore" />
        <article className="memoir-text">
          {sections.map((section, i) => (
            <section id={`memoir-${i}`} key={section.title}>
              <h2>
                {section.title}
                <HanddrawnMark className="chapter-mark" />
              </h2>
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
            <Anchor href={`#memoir-${i}`} key={section.title}>
              {section.title}
            </Anchor>
          ))}
          <CoastalVignette kind="tree" />
          <p>
            {t("motto1")}
            <br />
            {t("motto2")}
          </p>
        </aside>
      </div>
      <ContentEngagementActions target={{ type: "page", id: "about" }} />
      <Discussion target={{ type: "page", id: "about" }} />
      <div className="memoir-next">
        <PencilLine className="memoir-shore" />
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
