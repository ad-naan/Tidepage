"use client";

import {
  useEffect,
  useLayoutEffect,
  useState,
  useRef,
  type RefObject,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useOverlayOwner } from "./OverlayScope";
import { surfaceSpring } from "@/shared/lib/motion";
import styles from "./AnchoredPanel.module.css";

/** Non-modal surface. Its disclosure owner controls dismissal; this surface restores anchor focus. */
export function AnchoredPanel({
  open,
  anchor,
  boundary,
  width,
  align = "end",
  id,
  label,
  children,
  className = "",
  onPointerEnter,
  onPointerLeave,
  placement = "bottom",
  getAnchorRect,
}: {
  open: boolean;
  anchor: HTMLElement | null;
  boundary?: RefObject<HTMLElement | null>;
  width: number;
  align?: "start" | "end";
  id: string;
  label: string;
  children: ReactNode;
  className?: string;
  onPointerEnter?: () => void;
  onPointerLeave?: () => void;
  placement?: "bottom" | "auto";
  getAnchorRect?: () => {
    top: number;
    bottom: number;
    left: number;
    right: number;
    width: number;
    height: number;
  };
}) {
  const owner = useOverlayOwner();
  const reduce = useReducedMotion();
  const surface = useRef<HTMLElement>(null);
  const lockedSide = useRef<boolean | null>(null);
  const [mounted, setMounted] = useState(false);
  const [position, setPosition] = useState({
    left: 16,
    top: 80,
    width,
    maxHeight: 600,
  });
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!open && surface.current?.contains(document.activeElement)) {
      anchor?.focus({ preventScroll: true });
    }
  }, [open, anchor]);
  useLayoutEffect(() => {
    if (!open || !anchor) {
      lockedSide.current = null;
      return;
    }
    let frame = 0;
    const measure = () => {
      frame = 0;
      const bounds = getAnchorRect?.() ?? anchor.getBoundingClientRect();
      const viewport = window.visualViewport;
      const viewportWidth = viewport?.width ?? window.innerWidth;
      const viewportHeight = viewport?.height ?? window.innerHeight;
      const offsetTop = viewport?.offsetTop ?? 0;
      const offsetLeft = viewport?.offsetLeft ?? 0;
      const panelWidth = Math.min(width, viewportWidth - 32);
      const preferredLeft =
        align === "start" ? bounds.left : bounds.right - panelWidth;
      const boundaryBottom =
        boundary?.current?.getBoundingClientRect().bottom ?? bounds.bottom;
      let top = Math.max(
        offsetTop + 12,
        bounds.bottom + 14,
        boundaryBottom + 12,
      );
      const below = offsetTop + viewportHeight - top - 16;
      const above = bounds.top - offsetTop - 24;
      const height = surface.current?.scrollHeight || 320;
      const preferredFlip =
        placement === "auto" && below < height && above > below;
      if (getAnchorRect && lockedSide.current === null)
        lockedSide.current = preferredFlip;
      const flip = getAnchorRect ? lockedSide.current : preferredFlip;
      if (flip)
        top = Math.max(
          offsetTop + 12,
          bounds.top - Math.min(height, above) - 12,
        );
      // Selection composers may grow while streaming. Keep the chosen side,
      // then slide within the viewport so their input and review controls stay usable.
      const availableHeight = getAnchorRect
        ? Math.max(100, viewportHeight - 32)
        : Math.max(100, flip ? above : offsetTop + viewportHeight - top - 16);
      if (getAnchorRect)
        top = Math.max(
          offsetTop + 12,
          Math.min(
            top,
            offsetTop + viewportHeight - Math.min(height, availableHeight) - 16,
          ),
        );
      const next = {
        left: Math.max(
          offsetLeft + 16,
          Math.min(preferredLeft, offsetLeft + viewportWidth - panelWidth - 16),
        ),
        top,
        width: panelWidth,
        maxHeight: availableHeight,
      };
      setPosition((previous) =>
        previous.left === next.left &&
        previous.top === next.top &&
        previous.width === next.width &&
        previous.maxHeight === next.maxHeight
          ? previous
          : next,
      );
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    const scroll = (event: Event) => {
      const target = event.target;
      if (
        target === document ||
        (getAnchorRect &&
          !(target instanceof Node && surface.current?.contains(target))) ||
        (target instanceof Element && target.contains(anchor))
      )
        schedule();
    };
    measure();
    const observer = new ResizeObserver(schedule);
    observer.observe(anchor);
    if (surface.current) observer.observe(surface.current);
    schedule();
    if (boundary?.current && boundary.current !== anchor)
      observer.observe(boundary.current);
    window.addEventListener("resize", schedule);
    window.addEventListener("scroll", scroll, { capture: true, passive: true });
    window.visualViewport?.addEventListener("resize", schedule);
    window.visualViewport?.addEventListener("scroll", schedule);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("resize", schedule);
      window.removeEventListener("scroll", scroll, true);
      window.visualViewport?.removeEventListener("resize", schedule);
      window.visualViewport?.removeEventListener("scroll", schedule);
    };
  }, [open, anchor, boundary, width, align, placement, mounted, getAnchorRect]);
  if (!mounted) return null;
  return createPortal(
    <AnimatePresence>
      {open && anchor && (
        <motion.section
          ref={surface}
          id={id}
          role="region"
          aria-label={label}
          data-ui-overlay-owner={owner}
          className={`${styles.panel} ${className}`}
          style={position}
          onPointerEnter={onPointerEnter}
          onPointerLeave={onPointerLeave}
          initial={{
            opacity: 0,
            y: reduce ? 0 : -5,
          }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: reduce ? 0 : -3 }}
          transition={
            reduce
              ? { duration: 0 }
              : {
                  y: surfaceSpring,
                  opacity: { duration: 0.14, ease: "easeOut" },
                }
          }
        >
          {children}
        </motion.section>
      )}
    </AnimatePresence>,
    anchor?.closest("dialog[open]") ??
      document.fullscreenElement ??
      document.body,
  );
}
