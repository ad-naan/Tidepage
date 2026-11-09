"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { ArrowUpRight, Users } from "lucide-react";
import { useDisclosure } from "@/shared/hooks/useDisclosure";
import { Link } from "@/shared/i18n/navigation";
import { apiGet } from "@/shared/http/client";
import { navigationItems } from "@/shared/config/site";
import type { ReaderPage } from "@/shared/realtime/readers";
import { Button } from "@/shared/ui/button/Button";
import { AnchoredPanel } from "@/shared/ui/overlay/AnchoredPanel";
import { OverlayScope } from "@/shared/ui/overlay/OverlayScope";
import { useLiveReaders } from "./useLiveReaders";
import styles from "./LiveReaders.module.css";

const owner = "live-readers";

function ReaderPageLabel({ path, locale }: ReaderPage) {
  const t = useTranslations("readers");
  const nav = useTranslations("nav");
  const entry = navigationItems.find((item) => item.href === path);
  const [title, setTitle] = useState<string>();
  useEffect(() => {
    if (!path.startsWith("/articles/")) return;
    const abort = new AbortController();
    void apiGet<{ title: string }>(
      `/api/v1/articles/${path.slice("/articles/".length)}?locale=${locale}`,
      {
        signal: abort.signal,
      },
    )
      .then((article) => setTitle(article.title))
      .catch(() => {});
    return () => abort.abort();
  }, [path, locale]);

  if (entry)
    return (
      <Link href={path} locale={locale} prefetch={false}>
        {nav(entry.key)}
      </Link>
    );
  if (path === "/explore")
    return (
      <Link href={path} locale={locale} prefetch={false}>
        {t("coast")}
      </Link>
    );
  return title ? (
    <Link href={path} locale={locale} lang={locale} prefetch={false}>
      {title}
    </Link>
  ) : (
    <span>{t("article")}</span>
  );
}

export function LiveReaders() {
  const t = useTranslations("readers");
  const format = useFormatter();
  const { status, snapshot } = useLiveReaders();
  const { open, toggle, ref } = useDisclosure(owner);
  const trigger = useRef<HTMLButtonElement>(null);
  const id = useId();
  return (
    <OverlayScope owner={owner}>
      <div className={styles.block} ref={ref}>
        <Button
          className={styles.trigger}
          ref={trigger}
          aria-expanded={open}
          aria-controls={id}
          title={t(status)}
          onClick={toggle}
        >
          <span
            className={styles.dot}
            data-status={status}
            aria-hidden="true"
          />
          <span>
            {snapshot ? t("count", { count: snapshot.total }) : t("title")}
          </span>
          <ArrowUpRight size={13} aria-hidden="true" />
        </Button>
        <AnchoredPanel
          className={styles.panel}
          open={open}
          anchor={trigger.current}
          width={380}
          align="start"
          placement="auto"
          id={id}
          label={t("title")}
        >
          <div className={styles.panelHeading}>
            <strong>{t("title")}</strong>
            <span>
              <span
                className={styles.dot}
                data-status={status}
                aria-hidden="true"
              />
              {t(status)}
            </span>
          </div>
          {snapshot &&
            (snapshot.pages.length ? (
              <ul className={styles.pages} aria-label={t("pages")}>
                {snapshot.pages.map(({ path, locale, count }) => (
                  <li key={`${locale}:${path}`}>
                    <ReaderPageLabel path={path} locale={locale} />
                    <span
                      className={styles.count}
                      aria-label={t("count", { count })}
                    >
                      <Users size={13} aria-hidden="true" />
                      {format.number(count)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={styles.empty}>{t("empty")}</p>
            ))}
          <p className={styles.note}>{t("note")}</p>
        </AnchoredPanel>
      </div>
    </OverlayScope>
  );
}
