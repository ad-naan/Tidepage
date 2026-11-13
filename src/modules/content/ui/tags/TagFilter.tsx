"use client";
import { useEffect, useId, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Check, ChevronDown, Hash, Search, X } from "lucide-react";
import { Link } from "@/shared/i18n/navigation";
import { Input } from "@/shared/ui/field/Input";
import { Button } from "@/shared/ui/button/Button";
import { useDisclosure } from "@/shared/hooks/useDisclosure";
import { AnchoredPanel } from "@/shared/ui/overlay/AnchoredPanel";
import { OverlayScope } from "@/shared/ui/overlay/OverlayScope";
import { PencilLine } from "@/shared/ui/drawing/CoastalMarks";
import { tagKey, type ContentTag } from "@/modules/content/domain/tags";
import { useTagSuggestions } from "./useTagSuggestions";
import styles from "./Tags.module.css";

export function TagFilter({
  kind,
  tags,
}: {
  kind: "articles" | "notes";
  tags: ContentTag[];
}) {
  const t = useTranslations("tags");
  const locale = useLocale();
  const params = useSearchParams();
  const selected = tagKey(params.get("tag") ?? "");
  const id = useId();
  const menu = useDisclosure(id);
  const anchor = useRef<HTMLButtonElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const suggestions = useTagSuggestions(locale, query, kind, menu.open);
  const label =
    [...tags, ...suggestions.tags].find((tag) => tag.key === selected)?.label ??
    selected;
  useEffect(() => {
    if (!menu.open) return;
    const frame = requestAnimationFrame(() => input.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [menu.open]);
  function url(tag: string) {
    const next = new URLSearchParams(params.toString());
    if (tag) next.set("tag", tag);
    else next.delete("tag");
    next.delete("page");
    next.delete("open");
    return `/${kind}${next.size ? `?${next}` : ""}`;
  }
  if (!tags.length && !selected) return null;
  return (
    <OverlayScope owner={id}>
      <div ref={menu.ref} className={styles.filter}>
        <Button
          ref={anchor}
          className={styles.trigger}
          aria-expanded={menu.open}
          aria-controls={id}
          title={selected ? label : t("filter")}
          aria-label={selected ? t("selected", { tag: label }) : t("filter")}
          onClick={menu.toggle}
        >
          <Hash size={13} aria-hidden="true" />
          <span className={styles.triggerLabel}>
            {selected ? label : t("label")}
          </span>
          <ChevronDown size={12} aria-hidden="true" />
        </Button>
        {selected && (
          <Link
            href={url("")}
            scroll={false}
            className={styles.clear}
            aria-label={t("clear")}
            title={t("clear")}
          >
            <X size={12} aria-hidden="true" />
          </Link>
        )}
        <AnchoredPanel
          open={menu.open}
          anchor={anchor.current}
          width={300}
          align="start"
          placement="auto"
          gap={8}
          id={id}
          label={t("filter")}
          surfaceStyle="paper"
          className={styles.panel}
        >
          <label className={styles.search}>
            <Search size={14} aria-hidden="true" />
            <Input
              ref={input}
              appearance="bare"
              data-focus="integrated"
              aria-label={t("search")}
              placeholder={t("search")}
              value={query}
              maxLength={80}
              onChange={(event) => setQuery(event.target.value)}
            />
            <PencilLine kind="fold" className={styles.searchShore} />
          </label>
          <Link
            href={url("")}
            scroll={false}
            className={styles.option}
            aria-current={!selected ? "true" : undefined}
            onClick={() => menu.setOpen(false)}
          >
            <span>{t("all")}</span>
            {!selected && <Check size={13} aria-hidden="true" />}
          </Link>
          <div className={styles.list} aria-busy={suggestions.loading}>
            {suggestions.tags.map((tag) => (
              <Link
                key={tag.key}
                href={url(tag.key)}
                scroll={false}
                className={styles.option}
                aria-current={selected === tag.key ? "true" : undefined}
                onClick={() => menu.setOpen(false)}
              >
                <span className={styles.optionLabel}>#{tag.label}</span>
                <span className={styles.optionMeta}>
                  <span>{tag.count}</span>
                  {selected === tag.key && (
                    <Check size={13} aria-hidden="true" />
                  )}
                </span>
              </Link>
            ))}
          </div>
          <p className={styles.hint} role="status">
            {suggestions.error
              ? t("failed")
              : suggestions.loading
                ? t("searching")
                : !suggestions.tags.length
                  ? t("empty")
                  : suggestions.tags.length === 20
                    ? t("limit")
                    : t("sorted")}
          </p>
          {suggestions.error && (
            <Button size="sm" onClick={suggestions.retry}>
              {t("retry")}
            </Button>
          )}
        </AnchoredPanel>
      </div>
    </OverlayScope>
  );
}
