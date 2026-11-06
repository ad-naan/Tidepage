"use client";
import { useEffect, useId, useRef, useState } from "react";
import { useMessages, useTranslations } from "next-intl";
import { SmilePlus } from "lucide-react";
import { stickers } from "@/shared/config/stickers";
import { IconButton, Button } from "@/shared/ui/button/Button";
import { Input } from "@/shared/ui/field/Input";
import { ExternalLink } from "@/shared/ui/link/Anchor";
import { FilterTabs } from "@/shared/ui/filter-tabs/FilterTabs";
import { AnchoredPanel } from "@/shared/ui/overlay/AnchoredPanel";
import { OverlayScope } from "@/shared/ui/overlay/OverlayScope";
import { useDisclosure } from "@/shared/hooks/useDisclosure";
import styles from "./StickerPicker.module.css";

export function StickerPicker({
  onSelect,
  disabled,
}: {
  onSelect: (id: string) => void;
  disabled?: boolean;
}) {
  const t = useTranslations("stickers");
  const labels = useMessages().stickers.items as Record<string, string>;
  const id = useId();
  const menu = useDisclosure(id);
  const trigger = useRef<HTMLButtonElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  useEffect(() => {
    if (menu.open) search.current?.focus({ preventScroll: true });
  }, [menu.open]);
  const items = stickers.filter(
    (item) =>
      (category === "all" || category === item.category) &&
      `${labels[item.key]} ${item.name}`
        .toLowerCase()
        .includes(query.toLowerCase().trim()),
  );
  return (
    <OverlayScope owner={id}>
      <div ref={menu.ref} className={styles.root}>
        <IconButton
          ref={trigger}
          aria-label={t("open")}
          title={t("open")}
          disabled={disabled}
          aria-expanded={menu.open}
          aria-controls={id}
          onPointerDown={(e) => e.preventDefault()}
          onClick={menu.toggle}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              menu.setOpen(true);
            }
          }}
        >
          <SmilePlus size={16} />
        </IconButton>
        <AnchoredPanel
          open={menu.open}
          anchor={trigger.current}
          id={id}
          label={t("title")}
          width={330}
          align="start"
          placement="auto"
          className={styles.panel}
        >
          <div className={styles.heading}>
            <strong>{t("title")}</strong>
            <small>{t("hint")}</small>
          </div>
          <Input
            ref={search}
            aria-label={t("search")}
            placeholder={t("search")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                document
                  .getElementById(`${id}-grid`)
                  ?.querySelector<HTMLButtonElement>("button")
                  ?.focus();
              }
            }}
          />
          <FilterTabs
            label={t("categories")}
            value={category}
            onChange={setCategory}
            options={(["all", "moods", "daily"] as const).map((value) => ({
              value,
              label: t(value),
            }))}
          />
          <div
            className={styles.grid}
            id={`${id}-grid`}
            onKeyDown={(e) => {
              if (
                ![
                  "ArrowLeft",
                  "ArrowRight",
                  "ArrowUp",
                  "ArrowDown",
                  "Home",
                  "End",
                ].includes(e.key)
              )
                return;
              const buttons = Array.from(
                e.currentTarget.querySelectorAll<HTMLButtonElement>("button"),
              );
              const current = buttons.indexOf(
                document.activeElement as HTMLButtonElement,
              );
              if (current < 0 || !buttons.length) return;
              e.preventDefault();
              const next =
                e.key === "Home"
                  ? 0
                  : e.key === "End"
                    ? buttons.length - 1
                    : Math.max(
                        0,
                        Math.min(
                          buttons.length - 1,
                          current +
                            ({
                              ArrowLeft: -1,
                              ArrowRight: 1,
                              ArrowUp: -7,
                              ArrowDown: 7,
                            }[e.key] || 0),
                        ),
                      );
              buttons[next]?.focus();
            }}
          >
            {items.map((sticker) => (
              <Button
                key={sticker.id}
                aria-label={labels[sticker.key]}
                title={labels[sticker.key]}
                className={styles.sticker}
                onClick={() => {
                  onSelect(sticker.id);
                  menu.setOpen(false);
                }}
                pressEffect={false}
              >
                <img
                  src={sticker.src}
                  alt=""
                  width={32}
                  height={32}
                  loading="lazy"
                  draggable={false}
                />
              </Button>
            ))}
          </div>
          {!items.length && <p className={styles.empty}>{t("empty")}</p>}
          <ExternalLink
            className={styles.credit}
            href="https://github.com/microsoft/fluentui-emoji"
          >
            {t("credit")}
          </ExternalLink>
        </AnchoredPanel>
      </div>
    </OverlayScope>
  );
}
