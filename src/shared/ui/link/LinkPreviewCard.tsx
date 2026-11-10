"use client";
import { MediaImage } from "@/shared/ui/image/MediaImage";
import { useEffect, useId, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowUpRight, Globe } from "lucide-react";
import type { LinkPreview } from "@/shared/contracts/link-preview";
import { apiGet } from "@/shared/http/client";
import { AnchoredPanel } from "@/shared/ui/overlay/AnchoredPanel";
import { OverlayScope } from "@/shared/ui/overlay/OverlayScope";
import { useDisclosure } from "@/shared/hooks/useDisclosure";
import { ExternalLink } from "./Anchor";
import styles from "./LinkPreviewCard.module.css";

const cache = new Map<string, { data: LinkPreview; expires: number }>();
export function LinkPreviewCard({
  anchor,
  onClose,
  onEnter,
  onLeave,
}: {
  anchor: HTMLAnchorElement;
  onClose: () => void;
  onEnter: () => void;
  onLeave: () => void;
}) {
  const id = useId();
  const menu = useDisclosure(id);
  const t = useTranslations("ui.linkPreview");
  const url = new URL(anchor.href);
  const [data, setData] = useState<LinkPreview>(() => {
    try {
      return JSON.parse(anchor.dataset.linkPreview || "{}");
    } catch {
      return {};
    }
  });
  const [failedImage, setFailedImage] = useState(false);
  useEffect(() => {
    menu.setOpen(true);
    const previous = anchor.getAttribute("aria-describedby");
    anchor.setAttribute(
      "aria-describedby",
      [previous, id].filter(Boolean).join(" "),
    );
    return () => {
      if (previous === null) anchor.removeAttribute("aria-describedby");
      else anchor.setAttribute("aria-describedby", previous);
    };
  }, [anchor, id]);
  useEffect(() => {
    function dismiss(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        onClose();
      }
    }
    function outside(event: PointerEvent) {
      if (
        event.target instanceof Element &&
        !event.target.closest(`[data-ui-overlay-owner="${CSS.escape(id)}"]`) &&
        !anchor.contains(event.target)
      )
        onClose();
    }
    document.addEventListener("keydown", dismiss);
    document.addEventListener("pointerdown", outside);
    return () => {
      document.removeEventListener("keydown", dismiss);
      document.removeEventListener("pointerdown", outside);
    };
  }, [onClose, anchor, id]);
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      if (entries.every((entry) => !entry.isIntersecting)) onClose();
    });
    observer.observe(anchor);
    return () => observer.disconnect();
  }, [anchor, onClose]);
  useEffect(() => {
    const controller = new AbortController();
    const href = anchor.href;
    const existing = cache.get(href);
    if (existing && existing.expires > Date.now()) {
      setData((current) => ({ ...existing.data, ...current }));
      return;
    }
    apiGet<LinkPreview>(
      `/api/v1/link-preview?url=${encodeURIComponent(href)}`,
      { signal: controller.signal },
    )
      .then((result) => {
        if (controller.signal.aborted) return;
        if (cache.size >= 128) cache.delete(cache.keys().next().value!);
        cache.set(href, {
          data: result,
          expires: Date.now() + (result.title ? 300_000 : 15_000),
        });
        setData((current) => ({ ...result, ...current }));
      })
      .catch(() => {
        /* The original link and hostname are always usable. */
      });
    return () => controller.abort();
  }, [anchor.href]);
  return (
    <OverlayScope owner={id}>
      <AnchoredPanel
        open={menu.open}
        anchor={anchor}
        id={id}
        label={t("label")}
        width={360}
        align="start"
        placement="auto"
        className={styles.preview}
        onPointerEnter={onEnter}
        onPointerLeave={onLeave}
      >
        <ExternalLink
          href={url.href}
          preview={false}
          className={styles.content}
          data-external-link-preview
          onFocus={onEnter}
          onBlur={onLeave}
        >
          {data.artworkUrl && !failedImage && (
            <MediaImage
              className={styles.artwork}
              src={data.artworkUrl}
              alt={data.artworkAlt || ""}
              referrerPolicy="no-referrer"
              sizes="360px"
              onUnavailable={() => setFailedImage(true)}
            />
          )}
          <span className={styles.details}>
            <strong>
              {data.title ||
                anchor.getAttribute("aria-label") ||
                anchor.innerText?.trim() ||
                url.hostname}
            </strong>
            {data.description && (
              <span className={styles.description}>{data.description}</span>
            )}
            <span className={styles.site}>
              <Globe size={12} aria-hidden />
              {data.siteName || url.hostname}
              <ArrowUpRight size={13} aria-hidden />
            </span>
            <span className={styles.url}>
              {url.hostname}
              {url.pathname === "/" ? "" : url.pathname}
            </span>
            <span className={styles.srOnly}>{t("open")}</span>
          </span>
        </ExternalLink>
      </AnchoredPanel>
    </OverlayScope>
  );
}
