"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowUpRight, Copy, Mail } from "lucide-react";
import type {
  FriendDirectory,
  SiteLinkInfo,
} from "@/modules/friends/domain/models";
import { ContentHeading } from "@/modules/content/ui/layout/ContentHeading";
import { Button } from "@/shared/ui/button/Button";
import { FilterTabs } from "@/shared/ui/filter-tabs/FilterTabs";
import { Dialog } from "@/shared/ui/dialog/Dialog";
import { Disclosure } from "@/shared/ui/disclosure/Disclosure";
import { useNotice } from "@/shared/ui/feedback/NoticeProvider";
import { ExternalLink } from "@/shared/ui/link/Anchor";
import { CoastGlyph, PencilLine } from "@/shared/ui/drawing/CoastalMarks";
import { profileLinks } from "@/shared/config/profile";
import { FriendCard } from "./FriendCard";
import { ProgressiveList } from "@/shared/ui/loading/ProgressiveList";
import styles from "./FriendsView.module.css";

const categories = ["all", "technology", "design", "life"] as const;
export function FriendsView({
  directory,
  siteInfo,
}: {
  directory: FriendDirectory;
  siteInfo: SiteLinkInfo;
}) {
  const t = useTranslations("friends");
  const [category, setCategory] = useState<(typeof categories)[number]>("all");
  const [open, setOpen] = useState(false);
  const { notify } = useNotice();
  const visible = directory.items.filter(
    (item) => category === "all" || item.category === category,
  );
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
      <div className={styles.layout}>
        <section aria-labelledby="friends-directory-title">
          <div className={styles.sectionHeading}>
            <div>
              <span className={styles.eyebrow}>{t("eyebrow")}</span>
              <h2 id="friends-directory-title">{t("directoryTitle")}</h2>
            </div>
            <span className={styles.count}>
              {t("count", { count: directory.items.length })}
            </span>
          </div>
          <FilterTabs
            label={t("filterLabel")}
            value={category}
            onChange={setCategory}
            options={categories.map((value) => ({
              value,
              label: t(`categories.${value}`),
              count: directory.items.filter(
                (item) => value === "all" || value === item.category,
              ).length,
            }))}
          />
          <ProgressiveList
            key={category}
            items={visible}
            as="ul"
            className={styles.grid}
            label={t("directoryTitle")}
          >
            {(friend) => <FriendCard key={friend.id} friend={friend} />}
          </ProgressiveList>
          {!visible.length && (
            <p className={styles.empty} role="status">
              {t("empty")}
            </p>
          )}
          <p className={styles.footnote}>
            <CoastGlyph kind="tide" />
            {t("footnote")}
          </p>
        </section>
        <aside
          className={styles.margin}
          aria-labelledby="friends-exchange-title"
        >
          <CoastGlyph kind="shell" className={styles.shell} />
          <span className={styles.eyebrow}>{t("exchangeEyebrow")}</span>
          <h2 id="friends-exchange-title">{t("exchangeTitle")}</h2>
          <p>{t("exchangeDescription")}</p>
          <Button
            variant="quiet"
            className={styles.exchangeButton}
            onClick={() => setOpen(true)}
          >
            <Mail size={14} aria-hidden="true" />
            {t("exchange")}
            <ArrowUpRight size={13} aria-hidden="true" />
          </Button>
          <PencilLine />
          <Disclosure summary={t("siteInfoTitle")} open>
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
            <ExternalLink
              className={styles.contact}
              href={profileLinks[0].href}
            >
              {t("contact")}
              <ArrowUpRight size={14} aria-hidden="true" />
            </ExternalLink>
            <Disclosure summary={t("siteInfoTitle")}>
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
