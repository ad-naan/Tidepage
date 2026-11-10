import { getFormatter, getTranslations } from "next-intl/server";
import { Bookmark, Heart, MessageCircle, TrendingUp } from "lucide-react";
import type { EngagementOverview } from "@/modules/engagement/server/overview";
import { EngagementInbox } from "@/modules/engagement/ui/EngagementInbox";
import { PencilFrame } from "@/shared/ui/drawing/CoastalMarks";
import { Disclosure } from "@/shared/ui/disclosure/Disclosure";
import styles from "./DashboardView.module.css";

const kinds = ["comment", "like", "save"] as const;
const icons = { comment: MessageCircle, like: Heart, save: Bookmark };

export async function EngagementOverviewView({
  overview,
  siteWide,
}: {
  overview: EngagementOverview | null;
  siteWide: boolean;
}) {
  const [t, format] = await Promise.all([
    getTranslations("admin.dashboard.engagement"),
    getFormatter(),
  ]);
  const peak = Math.max(
    1,
    ...(overview?.days ?? []).map(({ counts }) =>
      kinds.reduce((sum, kind) => sum + (counts[kind] ?? 0), 0),
    ),
  );
  const step = Math.ceil(peak / 4);
  const labels = [4, 3, 2, 1, 0].map((multiple) => multiple * step);
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
                <div key={kind} className={styles.metric} data-kind={kind}>
                  <PencilFrame kind="ticket" />
                  <dt>
                    <span>
                      <Icon size={18} aria-hidden="true" />
                    </span>
                    {t(`metric.${kind}`)}
                  </dt>
                  <dd>{format.number(count?.total ?? 0)}</dd>
                  <dd className={styles.recentCount}>
                    {t("lastSevenDays", { count: count?.recent ?? 0 })}
                  </dd>
                </div>
              );
            })}
          </dl>
          <div className={styles.spread}>
            <EngagementInbox activity={overview.activity} />
            <section
              className={styles.chart}
              aria-labelledby="engagement-trend"
            >
              <PencilFrame />
              <header>
                <TrendingUp size={20} aria-hidden="true" />
                <div className={styles.sectionHeading}>
                  <h3 id="engagement-trend">{t("trend")}</h3>
                  <p>{t("trendDescription")}</p>
                </div>
              </header>
              <ul className={styles.legend}>
                {kinds.map((kind) => (
                  <li key={kind} data-kind={kind}>
                    {t(`metric.${kind}`)}
                  </li>
                ))}
              </ul>
              <div className={styles.plot} aria-hidden="true">
                <div className={styles.scale}>
                  {labels.map((label) => (
                    <span key={label}>{format.number(label)}</span>
                  ))}
                </div>
                <div className={styles.columns}>
                  {overview.days.map(({ date, counts }) => {
                    let bottom = 100;
                    return (
                      <div key={date}>
                        <svg viewBox="0 0 32 100" preserveAspectRatio="none">
                          {kinds.map((kind) => {
                            const height =
                              ((counts[kind] ?? 0) * 100) / labels[0];
                            const top = bottom - height;
                            const path = `M3 ${bottom} L2 ${top + height * 0.12} Q15 ${top - height * 0.1} 29 ${top + height * 0.04} L30 ${bottom} Z`;
                            bottom = top;
                            return (
                              height > 0 && (
                                <path key={kind} data-kind={kind} d={path} />
                              )
                            );
                          })}
                        </svg>
                        <time dateTime={date}>
                          {format.dateTime(new Date(`${date}T00:00:00Z`), {
                            month: "numeric",
                            day: "numeric",
                            timeZone: "UTC",
                          })}
                        </time>
                      </div>
                    );
                  })}
                </div>
              </div>
              <Disclosure
                className={styles.chartDetails}
                summary={t("chartData")}
              >
                <table>
                  <thead>
                    <tr>
                      <th scope="col">{t("date")}</th>
                      {kinds.map((kind) => (
                        <th scope="col" key={kind}>
                          {t(`metric.${kind}`)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {overview.days.map(({ date, counts }) => (
                      <tr key={date}>
                        <th scope="row">
                          {format.dateTime(new Date(`${date}T00:00:00Z`), {
                            month: "short",
                            day: "numeric",
                            timeZone: "UTC",
                          })}
                        </th>
                        {kinds.map((kind) => (
                          <td key={kind}>{format.number(counts[kind] ?? 0)}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Disclosure>
            </section>
          </div>
        </>
      ) : (
        <p role="alert">{t("failed")}</p>
      )}
    </section>
  );
}
