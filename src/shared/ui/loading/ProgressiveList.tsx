"use client";
import { useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/shared/ui/button/Button";
import styles from "./ProgressiveList.module.css";

/** Bounds mounted views; callers retain ownership of fetching, filtering and item markup. */
export function ProgressiveList<T>({
  items,
  children,
  pageSize = 12,
  className,
  trailing,
  as: Container = "div",
  label,
}: {
  items: readonly T[];
  children: (item: T, index: number) => ReactNode;
  pageSize?: number;
  className?: string;
  trailing?: ReactNode;
  as?: "div" | "ul";
  label?: string;
}) {
  const [count, setCount] = useState(pageSize);
  const t = useTranslations("ui.progressive");
  return (
    <>
      <Container className={className} aria-label={label}>
        {items.slice(0, count).map(children)}
        {trailing}
      </Container>
      {items.length > pageSize && (
        <div className={styles.footer}>
          <span role="status">
            {t("count", {
              count: Math.min(count, items.length),
              total: items.length,
            })}
          </span>
          {count < items.length && (
            <Button
              variant="quiet"
              onClick={() => setCount((current) => current + pageSize)}
            >
              {t("more")}
            </Button>
          )}
        </div>
      )}
    </>
  );
}
