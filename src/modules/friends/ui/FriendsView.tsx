"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { listItemMotion } from "@/shared/lib/motion";
import { useTranslations } from "next-intl";
import { ArrowUpRight, Copy, Mail } from "lucide-react";
import type {
  PublicFriend,
  SiteLinkInfo,
} from "@/modules/friends/domain/models";
import { Button } from "@/shared/ui/button/Button";
import { Dialog } from "@/shared/ui/dialog/Dialog";
import { Disclosure } from "@/shared/ui/disclosure/Disclosure";
import { useNotice } from "@/shared/ui/feedback/NoticeProvider";
import { ContentHeading } from "@/modules/content/ui/layout/ContentHeading";
import { ExternalLink } from "@/shared/ui/link/Anchor";
import { CoastGlyph, PencilLine } from "@/shared/ui/drawing/CoastalMarks";
import { profile } from "@/shared/config/profile";
import { MediaImage } from "@/shared/ui/image/MediaImage";
import styles from "./FriendsView.module.css";

export function FriendsView({
  siteInfo,
  friends,
}: {
  siteInfo: SiteLinkInfo;
  friends: PublicFriend[];
}) {
  const t = useTranslations("friends");
  const reduced = useReducedMotion();
  const [open, setOpen] = useState(false);
  const { notify } = useNotice();
  async function copyInfo() {
    try {
      await navigator.clipboard.writeText(JSON.stringify(siteInfo, null, 2));
      notify({ title: t("copied"), tone: "success" });
    } catch {
      notify({ title: t("copyFailed"), detail: t("copyHelp"), tone: "error" });
    }
  }
  const info = (
    <dl className={styles.siteInfo}>
      {(["name", "url", "avatar", "description"] as const).map((key) => (
        <div key={key}>
          <dt>{t(`fields.${key}`)}</dt>
          <dd>{siteInfo[key]}</dd>
        </div>
      ))}
    </dl>
  );
  return (
    <div className={`inner-page ${styles.friends}`}>
      <ContentHeading
        room="friends"
        title={t("title")}
        description={t("description")}
      />
      <div className={styles.book}>
        <section aria-labelledby="friends-directory-title">
          <div className={styles.sectionHeading}>
            <h2 id="friends-directory-title">{t("directoryTitle")}</h2>
            <span className={styles.eyebrow}>{t("eyebrow")}</span>
          </div>
          {friends.length ? (
            <ol className={styles.directory}>
              {friends.map((friend, index) => (
                <motion.li key={friend.id} {...listItemMotion(index, reduced)}>
                  <span className={styles.index} aria-hidden="true">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div className={styles.entry}>
                    <span className={styles.eyebrow}>
                      {t(`categories.${friend.category}`)}
                    </span>
                    <h3>
                      <ExternalLink href={friend.url}>
                        {friend.name}
                        <ArrowUpRight size={16} aria-hidden="true" />
                      </ExternalLink>
                    </h3>
                    <span className={styles.domain}>
                      {new URL(friend.url).hostname}
                    </span>
                    {friend.description && <p>{friend.description}</p>}
                  </div>
                </motion.li>
              ))}
            </ol>
          ) : (
            <p className={styles.empty}>{t("empty")}</p>
          )}
          <p className={styles.footnote}>
            <CoastGlyph kind="tide" />
            {t("footnote")}
          </p>
        </section>
        <aside
          className={styles.exchange}
          aria-labelledby="friends-exchange-title"
        >
          <CoastGlyph kind="shell" />
          <div>
            <span className={styles.eyebrow}>{t("exchangeEyebrow")}</span>
            <h2 id="friends-exchange-title">{t("exchangeTitle")}</h2>
            <p>{t("exchangeDescription")}</p>
          </div>
          <Button
            variant="quiet"
            className={styles.exchangeButton}
            onClick={() => setOpen(true)}
          >
            <Mail size={14} aria-hidden="true" />
            {t("exchange")}
            <ArrowUpRight size={13} aria-hidden="true" />
          </Button>
          <div className={styles.station}>
            <MediaImage
              src={siteInfo.avatar}
              alt=""
              width={34}
              height={34}
              loading="lazy"
              sizes="34px"
            />
            <div>
              <strong>{siteInfo.name}</strong>
              <p>{siteInfo.description}</p>
            </div>
          </div>
          <Disclosure summary={t("siteInfoTitle")}>
            {info}
            <Button size="sm" variant="quiet" onClick={copyInfo}>
              <Copy size={13} aria-hidden="true" />
              {t("copy")}
            </Button>
          </Disclosure>
        </aside>
      </div>
      <div className={styles.signoff}>
        <PencilLine kind="trail" />
        <p>{t("signoff")}</p>
        <CoastGlyph kind="wind" />
      </div>
      {open && (
        <Dialog title={t("exchange")} onClose={() => setOpen(false)}>
          <div className={styles.exchangeContent}>
            <p>{t("invitation")}</p>
            <ol>
              {(["original", "available", "respect"] as const).map((key) => (
                <li key={key}>{t(`guidelines.${key}`)}</li>
              ))}
            </ol>
            <p>{t("contactHelp")}</p>
            <ExternalLink className={styles.contact} href={profile.github}>
              {t("contact")}
              <ArrowUpRight size={14} aria-hidden="true" />
            </ExternalLink>
            <Disclosure summary={t("siteInfoTitle")} open>
              {info}
              <Button variant="quiet" size="sm" onClick={copyInfo}>
                <Copy size={13} aria-hidden="true" />
                {t("copy")}
              </Button>
            </Disclosure>
          </div>
        </Dialog>
      )}
    </div>
  );
}
