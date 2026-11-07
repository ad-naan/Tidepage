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
import { siteAssets } from "@/shared/config/assets";

import { RichText } from "../rich-text/RichText";

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
        <div className={styles.interestHeading}>
          <span>{t("offscreen")}</span>
          <h2 id="about-interests-title">{t("offscreenNote")}</h2>
        </div>
        <div className={styles.interestCopy}>
          {[page.interests.slice(0, 2), page.interests.slice(2)].map(
            (pair, index) => (
              <p key={index}>
                {pair.map((interest, i) => (
                  <span key={i}>
                    <em>{interest.label}</em>
                    {interest.description}{" "}
                  </span>
                ))}
              </p>
            ),
          )}
        </div>
        <span className={styles.interestAside}>{t("offscreenAside")}</span>
      </section>
      <div className={styles.body}>
        <article className={styles.story}>
          {page.body && <RichText document={page.body} />}
          <div className={styles.signoff}>
            <p>
              <AuthorNameText text={page.signature} />
            </p>
            <AuthorSignature size="md" />
          </div>
        </article>
        <aside className={styles.margin}>
          <img
            src={siteAssets.siteIcon}
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
