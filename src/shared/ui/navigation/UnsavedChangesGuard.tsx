"use client";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Dialog } from "@/shared/ui/dialog/Dialog";
import { Button } from "@/shared/ui/button/Button";
/** Shared page-leave behavior for local forms. Caller owns saving and dirty state. */
export function UnsavedChangesGuard({ dirty }: { dirty: boolean }) {
  const t = useTranslations("ui.unsaved");
  const latest = useRef(dirty);
  latest.current = dirty;
  const [destination, setDestination] = useState<string | null>(null);
  useEffect(() => {
    if (!dirty) return;
    const before = (e: BeforeUnloadEvent) => {
      if (latest.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", before);
    return () => window.removeEventListener("beforeunload", before);
  }, [dirty]);
  useEffect(() => {
    const click = (e: MouseEvent) => {
      if (
        !latest.current ||
        e.defaultPrevented ||
        e.metaKey ||
        e.ctrlKey ||
        e.altKey ||
        e.shiftKey
      )
        return;
      const a = (e.target as Element)?.closest?.(
        "a[href]",
      ) as HTMLAnchorElement | null;
      if (
        !a ||
        a.target === "_blank" ||
        a.hasAttribute("download") ||
        a.getAttribute("href")?.startsWith("#")
      )
        return;
      e.preventDefault();
      e.stopPropagation();
      setDestination(a.href);
    };
    document.addEventListener("click", click, true);
    return () => document.removeEventListener("click", click, true);
  }, []);
  return destination ? (
    <Dialog title={t("title")} onClose={() => setDestination(null)}>
      <p>{t("help")}</p>
      <Button variant="quiet" onClick={() => setDestination(null)}>
        {t("stay")}
      </Button>
      <Button
        onClick={() => {
          latest.current = false;
          window.location.assign(destination);
        }}
      >
        {t("leave")}
      </Button>
    </Dialog>
  ) : null;
}
