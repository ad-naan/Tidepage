"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  ArrowUpRight,
  Bell,
  Bookmark,
  Heart,
  MessageCircle,
} from "lucide-react";
import type {
  EngagementActivity,
  EngagementKind,
} from "@/modules/engagement/server/overview";
import { RichText } from "@/modules/content/ui/rich-text/RichText";
import { localeRegistry } from "@/shared/i18n/config";
import { Link } from "@/shared/i18n/navigation";
import { Avatar } from "@/shared/ui/avatar/Avatar";
import { Button } from "@/shared/ui/button/Button";
import { Disclosure } from "@/shared/ui/disclosure/Disclosure";
import { PencilFrame } from "@/shared/ui/drawing/CoastalMarks";
import { FilterTabs } from "@/shared/ui/filter-tabs/FilterTabs";
import { DateTime } from "@/shared/ui/typography/DateTime";
import styles from "./EngagementInbox.module.css";

const icons = { comment: MessageCircle, like: Heart, save: Bookmark };
const filters = ["all", "comment", "like", "save"] as const;
const previewLength = 160;

function targetHref(event: EngagementActivity) {
  const id = encodeURIComponent(event.targetId);
  switch (event.type) {
    case "article":
      return `/articles/${id}${event.kind === "comment" ? "#article-comments" : ""}`;
    case "page":
      return event.kind === "comment" ? "/about#about-comments" : "/about";
    case "note":
      return `/notes?open=${id}`;
    case "project":
      return `/projects?open=${id}`;
  }
}

export function EngagementInbox({
  activity,
  readerOnly = false,
}: {
  activity: EngagementActivity[];
  readerOnly?: boolean;
}) {
  const t = useTranslations("admin.dashboard.engagement");
  const nav = useTranslations("nav");
  const [kind, setKind] = useState<"all" | EngagementKind>("all");
  const [expanded, setExpanded] = useState(false);
  const visible = activity
    .filter((event) => kind === "all" || event.kind === kind)
    .slice(0, 8);
  return (
    <section className={styles.inbox} aria-label={t("activity")}>
      <PencilFrame kind="note" />
      <header>
        <Bell size={20} aria-hidden="true" />
        <div>
          <h3>{t("activity")}</h3>
          <p>
            {t(
              readerOnly ? "readerActivityDescription" : "activityDescription",
            )}
          </p>
        </div>
      </header>
      <FilterTabs
        variant="inline"
        label={t("filter")}
        value={kind}
        options={filters
          .filter((value) => !readerOnly || value !== "save")
          .map((value) => ({
            value,
            label: value === "all" ? t("all") : t(`metric.${value}`),
          }))}
        onChange={(value) => {
          setKind(value);
          setExpanded(false);
        }}
      />
      {visible.length ? (
        <ol className={styles.events}>
          {visible.slice(0, expanded ? visible.length : 4).map((event) => {
            const Icon = icons[event.kind];
            const title =
              event.title ||
              (event.type === "page"
                ? nav("about")
                : t(`target.${event.type}`));
            const comment = event.document ? (
              <RichText document={event.document} compact />
            ) : (
              <p>{event.body}</p>
            );
            return (
              <li key={`${event.id}:${event.createdAt}`} data-kind={event.kind}>
                <div className={styles.identity}>
                  {event.author ? (
                    <Avatar name={event.author} size="md" />
                  ) : (
                    <span className={styles.anonymous}>
                      <Icon size={16} aria-hidden="true" />
                    </span>
                  )}
                </div>
                <div className={styles.event}>
                  <div className={styles.meta}>
                    <p>
                      {event.author && (
                        <>
                          {event.readerId && !readerOnly ? (
                            <Link
                              href={`/admin/readers?reader=${event.readerId}`}
                              prefetch={false}
                              className={styles.person}
                            >
                              {event.author}
                            </Link>
                          ) : (
                            <strong className={styles.person}>
                              {event.author}
                            </strong>
                          )}{" "}
                        </>
                      )}
                      <span>{t(`event.${event.kind}`)}</span>
                    </p>
                    <DateTime value={event.createdAt} mode="activity" />
                  </div>
                  <div className={styles.context}>
                    <span className={styles.type}>
                      <Icon size={12} aria-hidden="true" />
                      {t(`target.${event.type}`)}
                    </span>
                    <Link
                      href={targetHref(event)}
                      locale={event.locale}
                      prefetch={false}
                      className={styles.target}
                      lang={event.title ? event.locale : undefined}
                    >
                      {title} <ArrowUpRight size={12} aria-hidden="true" />
                    </Link>
                    <span lang={event.locale} className={styles.language}>
                      {localeRegistry[event.locale].name}
                    </span>
                  </div>
                  {event.body &&
                    (event.body.length > previewLength ||
                    event.body.split("\n").length > 3 ? (
                      <Disclosure
                        className={styles.quote}
                        summary={
                          <>
                            <span
                              className={styles.excerpt}
                              lang={event.locale}
                            >
                              {event.body.slice(0, previewLength)}
                            </span>
                            <span className={styles.readComment}>
                              {t("readComment")}
                            </span>
                            <span className={styles.closeComment}>
                              {t("closeComment")}
                            </span>
                          </>
                        }
                      >
                        <div lang={event.locale}>{comment}</div>
                      </Disclosure>
                    ) : (
                      <div className={styles.quote} lang={event.locale}>
                        {comment}
                      </div>
                    ))}
                </div>
              </li>
            );
          })}
        </ol>
      ) : (
        <p className={styles.empty} role="status">
          {t(kind === "all" ? "empty" : "emptyFilter")}
        </p>
      )}
      {visible.length > 4 && (
        <Button
          className={styles.more}
          variant="quiet"
          size="sm"
          aria-expanded={expanded}
          onClick={() => setExpanded(!expanded)}
        >
          {t(expanded ? "less" : "more")}
        </Button>
      )}
    </section>
  );
}
