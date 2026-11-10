import { getFormatter, getTranslations } from "next-intl/server";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Search,
  UsersRound,
} from "lucide-react";
import type { getReaderDirectory } from "@/modules/identity/server/readers";
import type { EngagementOverview } from "@/modules/engagement/server/overview";
import { EngagementInbox } from "@/modules/engagement/ui/EngagementInbox";
import { Link } from "@/shared/i18n/navigation";
import { Avatar } from "@/shared/ui/avatar/Avatar";
import { Button } from "@/shared/ui/button/Button";
import { Input } from "@/shared/ui/field/Input";
import { PencilFrame, SketchLabel } from "@/shared/ui/drawing/CoastalMarks";
import { DateTime } from "@/shared/ui/typography/DateTime";
import styles from "./ReaderDirectoryView.module.css";

function directoryHref(query: string, page: number, readerId?: string) {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (page > 1) params.set("page", String(page));
  if (readerId) params.set("reader", readerId);
  return params.size ? `/admin/readers?${params}` : "/admin/readers";
}

export async function ReaderDirectoryView({
  directory,
  query,
  readerRequested,
  engagement,
}: {
  directory: Awaited<ReturnType<typeof getReaderDirectory>>;
  query: string;
  readerRequested: boolean;
  engagement: EngagementOverview | null;
}) {
  const [t, activity, format] = await Promise.all([
    getTranslations("admin.readers"),
    getTranslations("admin.dashboard.engagement"),
    getFormatter(),
  ]);
  return (
    <div className={styles.directory}>
      <header className={styles.heading}>
        <PencilFrame kind="note" />
        <SketchLabel kind="leaf">{t("label")}</SketchLabel>
        <h1>{t("title")}</h1>
        <p>{t("description")}</p>
      </header>
      {directory ? (
        <div
          className={styles.content}
          data-detail={Boolean(directory.selected)}
        >
          {directory.selected && (
            <section className={styles.detail} aria-labelledby="reader-detail">
              <div className={styles.profile}>
                <PencilFrame kind="ticket" />
                <div className={styles.profileHeading}>
                  <Avatar name={directory.selected.name} size="lg" />
                  <div>
                    <h2 id="reader-detail">{directory.selected.name}</h2>
                    {directory.selected.email && (
                      <p>{directory.selected.email}</p>
                    )}
                  </div>
                </div>
                <p>
                  {t("joined")} <DateTime value={directory.selected.joinedAt} />
                </p>
                {engagement && (
                  <dl className={styles.stats}>
                    {(["comment", "like"] as const).map((kind) => (
                      <div key={kind}>
                        <dt>{activity(`metric.${kind}`)}</dt>
                        <dd>
                          {format.number(engagement.counts[kind]?.total ?? 0)}
                        </dd>
                      </div>
                    ))}
                  </dl>
                )}
                <Link
                  href={directoryHref(query, directory.currentPage)}
                  className={styles.close}
                >
                  <ArrowLeft size={14} aria-hidden="true" /> {t("close")}
                </Link>
              </div>
              {engagement ? (
                <EngagementInbox
                  key={directory.selected.id}
                  activity={engagement.activity}
                  readerOnly
                />
              ) : (
                <p role="alert">{activity("failed")}</p>
              )}
            </section>
          )}
          <section className={styles.list} aria-labelledby="reader-list">
            <PencilFrame />
            <div className={styles.listHeading}>
              <h2 id="reader-list">
                <UsersRound size={19} aria-hidden="true" /> {t("list")}
              </h2>
              <p>{t("count", { count: directory.total })}</p>
            </div>
            <form
              className={styles.search}
              role="search"
              aria-label={t("search")}
            >
              <Input
                key={query}
                name="q"
                type="search"
                defaultValue={query}
                maxLength={100}
                aria-label={t("searchPlaceholder")}
                placeholder={t("searchPlaceholder")}
              />
              <Button variant="quiet" type="submit">
                <Search size={15} aria-hidden="true" /> {t("search")}
              </Button>
              {query && <Link href="/admin/readers">{t("clear")}</Link>}
            </form>
            {readerRequested && !directory.selected && (
              <p role="status">{t("unavailable")}</p>
            )}
            {directory.accounts.length ? (
              <ul className={styles.accounts}>
                {directory.accounts.map((account) => (
                  <li key={account.id}>
                    <Link
                      href={directoryHref(
                        query,
                        directory.currentPage,
                        account.id,
                      )}
                      aria-current={
                        account.id === directory.selected?.id
                          ? "true"
                          : undefined
                      }
                      prefetch={false}
                    >
                      <Avatar name={account.name} />
                      <span className={styles.name}>
                        <strong>{account.name}</strong>
                        {account.email && <small>{account.email}</small>}
                      </span>
                      <DateTime value={account.joinedAt} />
                      <ArrowUpRight size={14} aria-hidden="true" />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p>{t(query ? "noMatches" : "empty")}</p>
            )}
            {directory.pageCount > 1 && (
              <nav className={styles.pagination} aria-label={t("pages")}>
                {directory.currentPage > 1 && (
                  <Link
                    href={directoryHref(
                      query,
                      directory.currentPage - 1,
                      directory.selected?.id,
                    )}
                    prefetch={false}
                  >
                    <ArrowLeft size={14} aria-hidden="true" /> {t("previous")}
                  </Link>
                )}
                <span>
                  {t("page", {
                    page: directory.currentPage,
                    total: directory.pageCount,
                  })}
                </span>
                {directory.currentPage < directory.pageCount && (
                  <Link
                    href={directoryHref(
                      query,
                      directory.currentPage + 1,
                      directory.selected?.id,
                    )}
                    prefetch={false}
                  >
                    {t("next")} <ArrowRight size={14} aria-hidden="true" />
                  </Link>
                )}
              </nav>
            )}
          </section>
        </div>
      ) : (
        <p role="alert">{t("failed")}</p>
      )}
    </div>
  );
}
