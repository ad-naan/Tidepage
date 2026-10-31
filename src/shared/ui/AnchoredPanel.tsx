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
}) {
  const owner = useOverlayOwner();
  const reduce = useReducedMotion();
  const surface = useRef<HTMLElement>(null);
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
    if (!open || !anchor) return;
    let frame = 0;
    const measure = () => {
      const bounds = anchor.getBoundingClientRect();
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
      const top = Math.max(
        offsetTop + 12,
        bounds.bottom + 14,
        boundaryBottom + 12,
      );
      setPosition({
        left: Math.max(
          offsetLeft + 16,
          Math.min(preferredLeft, offsetLeft + viewportWidth - panelWidth - 16),
        ),
        top,
        width: panelWidth,
        maxHeight: Math.max(100, offsetTop + viewportHeight - top - 16),
      });
    };
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };
    measure();
    const observer = new ResizeObserver(schedule);
    observer.observe(anchor);
    if (boundary?.current && boundary.current !== anchor)
      observer.observe(boundary.current);
    window.addEventListener("resize", schedule);
    window.addEventListener("scroll", schedule, true);
    window.visualViewport?.addEventListener("resize", schedule);
    window.visualViewport?.addEventListener("scroll", schedule);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("resize", schedule);
      window.removeEventListener("scroll", schedule, true);
      window.visualViewport?.removeEventListener("resize", schedule);
      window.visualViewport?.removeEventListener("scroll", schedule);
    };
  }, [open, anchor, boundary, width, align]);
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
            scale: reduce ? 1 : 0.985,
          }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: reduce ? 0 : -3 }}
          transition={{ duration: reduce ? 0 : 0.18 }}
        >
          {children}
        </motion.section>
      )}
    </AnimatePresence>,
    document.body,
  );
}
