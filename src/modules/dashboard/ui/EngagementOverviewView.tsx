import { getFormatter, getTranslations } from "next-intl/server";
import { Bookmark, Heart, MessageCircle } from "lucide-react";
import type { EngagementOverview } from "@/modules/engagement/server/overview";
import { localeRegistry } from "@/shared/i18n/config";
import { Link } from "@/shared/i18n/navigation";
import { PencilFrame } from "@/shared/ui/drawing/CoastalMarks";
import { DateTime } from "@/shared/ui/typography/DateTime";
import styles from "./DashboardView.module.css";

const icons = { comment: MessageCircle, like: Heart, save: Bookmark };
const kinds = ["comment", "like", "save"] as const;

export async function EngagementOverviewView({
  overview,
  siteWide,
}: {
  overview: EngagementOverview | null;
  siteWide: boolean;
}) {
  const [t, nav, format] = await Promise.all([
    getTranslations("admin.dashboard.engagement"),
    getTranslations("nav"),
    getFormatter(),
  ]);
  return (
    <section className={styles.overview} aria-labelledby="engagement-overview">
      <div className={styles.sectionHeading}>
        <h2 id="engagement-overview">{t("title")}</h2>
        <p>{t(siteWide ? "siteScope" : "authorScope")}</p>
      </div>
      {overview ? (
        <>
          <dl className={styles.metrics}>
            {kinds.map((kind) => {
              const Icon = icons[kind];
              const count = overview.counts[kind];
              return (
                <div key={kind}>
                  <PencilFrame />
                  <dt>
                    <Icon size={15} aria-hidden="true" /> {t(`metric.${kind}`)}
                  </dt>
                  <dd>{format.number(count?.total ?? 0)}</dd>
                  <dd className={styles.recentCount}>
                    {t("lastSevenDays", { count: count?.recent ?? 0 })}
                  </dd>
                </div>
              );
            })}
          </dl>
          <div className={styles.sectionHeading}>
            <h3>{t("activity")}</h3>
          </div>
          {overview.activity.length ? (
            <ol className={styles.activity}>
              {overview.activity.map((event, index) => {
                const Icon = icons[event.kind];
                const href =
                  event.type === "article"
                    ? `/articles/${event.targetId}${event.kind === "comment" ? "#article-comments" : ""}`
                    : event.type === "page"
                      ? "/about"
                      : null;
                const title =
                  event.title ||
                  (event.type === "page"
                    ? nav("about")
                    : t(`target.${event.type}`));
                return (
                  <li key={index}>
                    <Icon
                      className={styles.activityIcon}
                      size={16}
                      aria-hidden="true"
                    />
                    <div className={styles.activityContent}>
                      <p className={styles.activityMeta}>
                        {event.author
                          ? t("commentBy", { author: event.author })
                          : t(`event.${event.kind}`)}
                        <span aria-hidden="true"> · </span>
                        {t(`target.${event.type}`)}
                        <span aria-hidden="true"> · </span>
                        <span lang={event.locale}>
                          {localeRegistry[event.locale].name}
                        </span>
                      </p>
                      {href ? (
                        <Link
                          href={href}
                          locale={event.locale}
                          prefetch={false}
                          lang={event.title ? event.locale : undefined}
                        >
                          {title}
                        </Link>
                      ) : (
                        <p lang={event.title ? event.locale : undefined}>
                          {title}
                        </p>
                      )}
                      {event.preview && (
                        <p className={styles.preview}>{event.preview}</p>
                      )}
                    </div>
                    <DateTime
                      value={event.createdAt}
                      mode="activity"
                      className={styles.activityTime}
                    />
                  </li>
                );
              })}
            </ol>
          ) : (
            <p className={styles.emptyActivity}>{t("empty")}</p>
          )}
        </>
      ) : (
        <p className={styles.emptyActivity} role="alert">
          {t("failed")}
        </p>
      )}
    </section>
  );
}
