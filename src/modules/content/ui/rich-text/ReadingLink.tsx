"use client";
import { useEffect, useId, useRef } from "react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import type { Embed } from "@/modules/content/domain/editor-document";
import { ExternalLink } from "@/shared/ui/link/Anchor";
import { AnchoredPanel } from "@/shared/ui/overlay/AnchoredPanel";
import { OverlayScope } from "@/shared/ui/overlay/OverlayScope";
import { useDisclosure } from "@/shared/hooks/useDisclosure";
import { ArrowUpRight } from "lucide-react";
import styles from "./ReadingLink.module.css";

export function ReadingLink({
  href,
  children,
  preview,
}: {
  href: string;
  children: ReactNode;
  preview?: Embed;
}) {
  const id = useId();
  const t = useTranslations("articleBlocks");
  const menu = useDisclosure(id);
  const anchor = useRef<HTMLAnchorElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  function cancel() {
    clearTimeout(timer.current);
  }
  function enter() {
    cancel();
    timer.current = setTimeout(() => menu.setOpen(true), 300);
  }
  function leave() {
    cancel();
    timer.current = setTimeout(() => menu.setOpen(false), 180);
  }
  useEffect(() => () => clearTimeout(timer.current), []);
  return (
    <OverlayScope owner={id}>
      <ExternalLink
        ref={anchor}
        href={href}
        onPointerEnter={(e) => {
          if (e.pointerType !== "touch") enter();
        }}
        onPointerLeave={leave}
        onFocus={() => menu.setOpen(true)}
        onBlur={leave}
        aria-describedby={menu.open ? id : undefined}
      >
        {children}
      </ExternalLink>
      <AnchoredPanel
        open={menu.open}
        anchor={anchor.current}
        id={id}
        label={t("preview")}
        width={320}
        align="start"
        className={styles.preview}
        onPointerEnter={cancel}
        onPointerLeave={leave}
      >
        <ExternalLink
          href={href}
          className={styles.content}
          onFocus={cancel}
          onBlur={leave}
        >
          <small>
            {preview?.siteName || new URL(href).hostname}
            <ArrowUpRight size={13} aria-hidden="true" />
          </small>
          {preview?.artworkUrl && (
            <img
              src={preview.artworkUrl}
              alt={preview.artworkAlt || ""}
              loading="lazy"
              referrerPolicy="no-referrer"
            />
          )}
          <strong>{preview?.title || children}</strong>
          {preview?.description && <span>{preview.description}</span>}
          <span className={styles.url}>{href}</span>
        </ExternalLink>
      </AnchoredPanel>
    </OverlayScope>
  );
}
