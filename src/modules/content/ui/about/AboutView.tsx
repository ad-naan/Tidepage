import { getLocale, getTranslations } from "next-intl/server";
import { ArrowUpRight } from "lucide-react";
import { getPersonalPage } from "@/modules/site-settings/server";
import {
  AuthorSignature,
  AuthorNameText,
} from "@/modules/identity/ui/AuthorSignature";
import { Discussion } from "@/modules/engagement/ui/Discussion";
import { Link } from "@/shared/i18n/navigation";
import { ExternalLink } from "@/shared/ui/link/Anchor";
import { profile, profileLinks } from "@/shared/config/profile";
import styles from "./AboutView.module.css";

import { HobbySketch } from "./HobbySketch";

export async function AboutView() {
  const locale = await getLocale();
  const [page, t] = await Promise.all([
    getPersonalPage(locale),
    getTranslations("about"),
  ]);
  return (
    <div className={styles.about}>
      <header className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>{t("eyebrow")}</p>
          <h1>
            <AuthorNameText text={page.title} />
          </h1>
          <div className={styles.identity}>
            <span>{page.identity}</span>
            <span className={styles.personality}>{page.personality}</span>
          </div>
          <p className={styles.intro}>
            <AuthorNameText text={page.intro} />
          </p>
          <div className={styles.links}>
            <ExternalLink href={profileLinks[0].href}>
              {t("github")}
              <ArrowUpRight size={13} aria-hidden="true" />
            </ExternalLink>
            <Link href="/projects">
              {t("projects")}
              <ArrowUpRight size={13} aria-hidden="true" />
            </Link>
          </div>
        </div>
        <figure className={styles.portrait}>
          <img
            src={profile.avatar}
            width={108}
            height={108}
            alt={t("avatar")}
          />
          <figcaption>{t("portraitNote")}</figcaption>
        </figure>
      </header>
      <section
        className={styles.interests}
        aria-labelledby="about-interests-title"
      >
        <div className={styles.interestHeading}><h2 id="about-interests-title">{t("offscreen")}</h2><span>{t("offscreenNote")}</span></div>
        <div className={styles.interestGrid}>
          {page.interests.map((interest, index) => {
            return (
              <div className={styles.interest} key={index}>
                <HobbySketch index={index} />
                <div><span className={styles.interestNumber}>{String(index+1).padStart(2,"0")} /</span><h3>{interest.label}</h3><p>{interest.description}</p></div>
              </div>
            );
          })}
        </div>
      </section>
      <div className={styles.body}>
        <article className={styles.story}>
          {page.sections.map((section, index) => (
            <section key={index} id={`about-section-${index}`}>
              {section.title && (
                <h2>
                  <AuthorNameText text={section.title} />
                </h2>
              )}
              {section.paragraphs.map((p, i) => (
                <p key={i}>
                  <AuthorNameText text={p} />
                </p>
              ))}
            </section>
          ))}
          <div className={styles.signoff}>
            <p>
              <AuthorNameText text={page.signature} />
            </p>
            <AuthorSignature size="md" />
          </div>
        </article>
        <aside className={styles.margin}>
          <img
            src="/brand/tidepage-icon.png"
            width={112}
            height={112}
            alt={t("otterAlt")}
            loading="lazy"
          />
          <p>{t("otterNote")}</p>
          <Link href="/site">
            {t("aboutSite")}
            <ArrowUpRight size={13} aria-hidden="true" />
          </Link>
        </aside>
      </div>
      <div className={styles.conversation}>
        <p>{t("conversation")}</p>
        <Discussion target={{ type: "page", id: "about" }} />
      </div>
    </div>
  );
}
