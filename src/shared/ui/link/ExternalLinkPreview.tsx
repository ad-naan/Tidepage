"use client";
import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { usePathname } from "@/shared/i18n/navigation";

const PreviewCard = dynamic(
  () => import("./LinkPreviewCard").then((module) => module.LinkPreviewCard),
  { ssr: false },
);

/** One delegated listener and one lazy surface, even on pages with thousands of links. */
export function ExternalLinkPreview() {
  const path = usePathname();
  const [anchor, setAnchor] = useState<HTMLAnchorElement | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => {
    clearTimeout(timer.current);
    setAnchor(null);
  }, [path]);
  useEffect(() => {
    function find(target: EventTarget | null) {
      const link =
        target instanceof Element
          ? target.closest<HTMLAnchorElement>("a[href]")
          : null;
      if (
        !link ||
        link.download ||
        link.closest('[contenteditable="true"], [data-link-preview="off"]')
      )
        return null;
      try {
        const url = new URL(link.href);
        return /^https?:$/.test(url.protocol) &&
          url.origin !== location.origin &&
          !url.username &&
          !url.password
          ? link
          : null;
      } catch {
        return null;
      }
    }
    function enter(event: PointerEvent | FocusEvent) {
      if (event instanceof PointerEvent && event.pointerType === "touch")
        return;
      const link = find(event.target);
      if (!link) return;
      clearTimeout(timer.current);
      timer.current = setTimeout(
        () => {
          if (link.isConnected) setAnchor(link);
        },
        event.type === "focusin" ? 0 : 300,
      );
    }
    function leave(event: PointerEvent | FocusEvent) {
      if (!find(event.target)) return;
      const related = event.relatedTarget;
      if (
        related instanceof Element &&
        (related.closest("[data-external-link-preview]") ||
          find(related) === find(event.target))
      )
        return;
      clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        if (
          document.activeElement === find(event.target) ||
          document.activeElement?.closest("[data-external-link-preview]")
        )
          return;
        setAnchor(null);
      }, 220);
    }
    document.addEventListener("pointerover", enter);
    document.addEventListener("pointerout", leave);
    document.addEventListener("focusin", enter);
    document.addEventListener("focusout", leave);
    return () => {
      clearTimeout(timer.current);
      document.removeEventListener("pointerover", enter);
      document.removeEventListener("pointerout", leave);
      document.removeEventListener("focusin", enter);
      document.removeEventListener("focusout", leave);
    };
  }, []);
  return anchor ? (
    <PreviewCard
      key={anchor.href}
      anchor={anchor}
      onClose={() => setAnchor(null)}
      onEnter={() => clearTimeout(timer.current)}
      onLeave={() => {
        clearTimeout(timer.current);
        timer.current = setTimeout(() => {
          if (
            document.activeElement === anchor ||
            document.activeElement?.closest("[data-external-link-preview]")
          )
            return;
          setAnchor(null);
        }, 220);
      }}
    />
  ) : null;
}
