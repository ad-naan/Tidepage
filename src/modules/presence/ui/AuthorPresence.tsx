"use client";

import { useEffect, useId, useRef, type RefObject } from "react";
import { useTranslations } from "next-intl";
import { X } from "lucide-react";
import { usePathname } from "@/shared/i18n/navigation";
import { useDisclosure } from "@/shared/hooks/useDisclosure";
import { Button } from "@/shared/ui/button/Button";
import { AnchoredPanel } from "@/shared/ui/overlay/AnchoredPanel";
import { OverlayScope } from "@/shared/ui/overlay/OverlayScope";
import { AuthorStatus } from "./AuthorStatus";
import { AuthorActivity } from "./AuthorActivity";
import styles from "./AuthorPresence.module.css";

const owner = "author-activity";

export function AuthorPresence({
  boundary,
}: {
  boundary: RefObject<HTMLElement | null>;
}) {
  const t = useTranslations("header");
  const { open, setOpen, toggle, ref } = useDisclosure(owner);
  const trigger = useRef<HTMLButtonElement>(null);
  const intent = useRef<"hover" | "click">("hover");
  const enterTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const id = useId();
  const pathname = usePathname();
  function cancelClose() {
    clearTimeout(leaveTimer.current);
  }
  function clearTimers() {
    clearTimeout(enterTimer.current);
    cancelClose();
  }
  function leave() {
    clearTimeout(enterTimer.current);
    if (intent.current !== "hover") return;
    cancelClose();
    leaveTimer.current = setTimeout(() => {
      const active = document.activeElement;
      if (
        trigger.current === active ||
        document.getElementById(id)?.contains(active)
      )
        return;
      setOpen(false);
    }, 180);
  }
  useEffect(() => {
    const dismiss = (event: Event) => {
      if (
        event.type === "garden-disclosure" &&
        (event as CustomEvent).detail === owner
      )
        return;
      if (event instanceof KeyboardEvent && event.key !== "Escape") return;
      if (
        event instanceof PointerEvent &&
        event.target instanceof Node &&
        (ref.current?.contains(event.target) ||
          document.getElementById(id)?.contains(event.target))
      )
        return;
      clearTimers();
    };
    window.addEventListener("garden-disclosure", dismiss);
    document.addEventListener("keydown", dismiss);
    document.addEventListener("pointerdown", dismiss);
    return () => {
      clearTimers();
      window.removeEventListener("garden-disclosure", dismiss);
      document.removeEventListener("keydown", dismiss);
      document.removeEventListener("pointerdown", dismiss);
    };
  }, []);
  useEffect(() => {
    clearTimers();
  }, [pathname]);
  return (
    <OverlayScope owner={owner}>
      <div ref={ref} className={styles.presence}>
        <Button
          ref={trigger}
          className={styles.trigger}
          aria-expanded={open}
          aria-controls={id}
          onPointerEnter={(event) => {
            if (event.pointerType === "touch") return;
            clearTimers();
            if (open) return;
            enterTimer.current = setTimeout(() => {
              intent.current = "hover";
              window.dispatchEvent(
                new CustomEvent("garden-disclosure", { detail: owner }),
              );
              setOpen(true);
            }, 200);
          }}
          onPointerLeave={leave}
          onFocus={cancelClose}
          onBlur={leave}
          onClick={() => {
            clearTimers();
            if (open && intent.current === "hover") {
              intent.current = "click";
              return;
            }
            intent.current = "click";
            toggle();
          }}
        >
          <AuthorStatus />
        </Button>
        <AnchoredPanel
          open={open}
          anchor={trigger.current}
          boundary={boundary}
          width={390}
          align="start"
          id={id}
          label={t("panels.activity")}
          onPointerEnter={cancelClose}
          onPointerLeave={leave}
        >
          <div
            onFocusCapture={() => {
              cancelClose();
              intent.current = "click";
            }}
          >
            <div className={styles.heading}>
              <span>{t("panels.activity")}</span>
              <Button
                onClick={() => {
                  clearTimers();
                  setOpen(false);
                }}
                aria-label={t("collapsePanel")}
              >
                <X size={16} />
              </Button>
            </div>
            <AuthorActivity />
          </div>
        </AnchoredPanel>
      </div>
    </OverlayScope>
  );
}
