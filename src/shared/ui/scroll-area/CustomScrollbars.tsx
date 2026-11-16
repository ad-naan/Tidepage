"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent,
  type KeyboardEvent,
} from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { useMediaQuery } from "@/shared/hooks/useMediaQuery";
import { touchMotionQuery } from "@/shared/lib/motion";

type Axis = "vertical" | "horizontal";
// Internal layout refreshes are not browser resizes. Other overlays may close on resize.
const SCROLLBARS_REFRESH_EVENT = "tidepage:scrollbars-refresh";
const hides = new Map<HTMLElement, Set<() => void>>();
const hostIds = new WeakMap<HTMLElement, number>();
let nextHostId = 0;
function hostId(host: HTMLElement) {
  if (!hostIds.has(host)) hostIds.set(host, ++nextHostId);
  return hostIds.get(host)!;
}
function unavailable(host: HTMLElement) {
  return (
    !host.isConnected ||
    !!host.closest(
      '[hidden], [inert], [data-closing="true"], dialog:not([open])',
    )
  );
}
type Geometry = {
  top: number;
  left: number;
  width: number;
  height: number;
  viewport: number;
  extent: number;
  offset: number;
  thumb: number;
  travel: number;
  position: number;
  visible: boolean;
};
const empty: Geometry = {
  top: 0,
  left: 0,
  width: 0,
  height: 0,
  viewport: 0,
  extent: 0,
  offset: 0,
  thumb: 0,
  travel: 0,
  position: 0,
  visible: false,
};

/** Overlay rails never change the scroll host's width or participate in its layout. */
function Scrollbar({ host, axis }: { host: HTMLElement | null; axis: Axis }) {
  const vertical = axis === "vertical";
  const t = useTranslations("ui.scroll");
  const [geometry, setGeometry] = useState<Geometry>(empty);
  const [dragging, setDragging] = useState(false);
  const rail = useRef<HTMLDivElement>(null);
  const thumbElement = useRef<HTMLDivElement>(null);
  const measured = useRef<Geometry>(empty);
  const drag = useRef<{
    pointer: number;
    offset: number;
    max: number;
    travel: number;
  } | null>(null);
  const originalSelect = useRef<string | null>(null);
  const isPage = host === null;
  const syncThumb = useCallback(
    (next: Geometry) => {
      if (!thumbElement.current) return;
      thumbElement.current.style.transform = vertical
        ? `translateY(${next.position}px)`
        : `translateX(${next.position}px)`;
      thumbElement.current.setAttribute(
        "aria-valuenow",
        String(Math.round(next.offset)),
      );
    },
    [vertical],
  );
  const read = useCallback(() => {
    const target = host || document.documentElement;
    if (host && unavailable(host)) {
      if (rail.current) rail.current.hidden = true;
      measured.current = empty;
      setGeometry(empty);
      return;
    }
    const bounds = host?.getBoundingClientRect();
    const viewport = vertical
      ? (host?.clientHeight ?? window.innerHeight)
      : (host?.clientWidth ?? window.innerWidth);
    const extent = vertical ? target.scrollHeight : target.scrollWidth;
    const offset = vertical
      ? (host?.scrollTop ?? window.scrollY)
      : (host?.scrollLeft ?? window.scrollX);
    const span = bounds ? (vertical ? bounds.height : bounds.width) : viewport;
    const thumb = Math.min(
      span,
      Math.max(34, (viewport / Math.max(extent, 1)) * span),
    );
    const travel = Math.max(0, span - thumb);
    const style = getComputedStyle(target);
    const overflow = vertical ? style?.overflowY : style?.overflowX;
    const clip = host?.closest<HTMLElement>("[data-scroll-clip]");
    const clipBounds = clip?.getBoundingClientRect();
    // Portalled rails must not escape a disclosure while its height is animating.
    const revealed =
      !bounds ||
      !clipBounds ||
      (bounds.top >= clipBounds.top - 2 &&
        bounds.bottom <= clipBounds.bottom + 2);
    const inViewport =
      !bounds ||
      (bounds.right > 0 &&
        bounds.bottom > 0 &&
        bounds.left < innerWidth &&
        bounds.top < innerHeight);
    const visible =
      extent > viewport + 1 &&
      viewport > 0 &&
      inViewport &&
      revealed &&
      ((!host &&
        (vertical || (overflow !== "hidden" && overflow !== "clip"))) ||
        (!!host &&
          (overflow === "auto" ||
            overflow === "scroll" ||
            overflow === "overlay") &&
          style?.display !== "none"));
    const next: Geometry = {
      top: bounds?.top ?? 0,
      left: bounds?.left ?? 0,
      width: bounds?.width ?? window.innerWidth,
      height: bounds?.height ?? window.innerHeight,
      viewport,
      extent,
      offset,
      thumb,
      travel,
      position: Math.max(
        0,
        Math.min(travel, (offset / Math.max(1, extent - viewport)) * travel),
      ),
      visible,
    };
    measured.current = next;
    syncThumb(next);
    setGeometry((previous) =>
      Object.keys(next).every(
        (key) =>
          previous[key as keyof Geometry] === next[key as keyof Geometry],
      )
        ? previous
        : next,
    );
  }, [host, vertical, syncThumb]);

  const updateOffset = useCallback(() => {
    const current = measured.current;
    if (!current.visible) return;
    const offset = vertical
      ? (host?.scrollTop ?? window.scrollY)
      : (host?.scrollLeft ?? window.scrollX);
    const position = Math.max(
      0,
      Math.min(
        current.travel,
        (offset / Math.max(1, current.extent - current.viewport)) *
          current.travel,
      ),
    );
    measured.current = { ...current, offset, position };
    syncThumb(measured.current);
  }, [host, vertical, syncThumb]);

  useLayoutEffect(() => {
    if (!host) return;
    const hide = () => {
      if (rail.current) rail.current.hidden = true;
      measured.current = empty;
      setGeometry(empty);
    };
    const entries = hides.get(host) ?? new Set();
    entries.add(hide);
    hides.set(host, entries);
    return () => {
      entries.delete(hide);
      if (!entries.size) hides.delete(host);
    };
  }, [host]);

  useEffect(() => {
    let frame = 0;
    let needsMeasure = false;
    const schedule = (measure = true) => {
      needsMeasure ||= measure;
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        if (needsMeasure) read();
        else updateOffset();
        needsMeasure = false;
      });
    };
    const scroll = (event: Event) => {
      const target = event.target;
      if (target === host || (!host && target === document)) schedule(false);
      else if (
        target === document ||
        (host && target instanceof Element && target.contains(host))
      )
        schedule();
    };
    read();
    const refresh = () => schedule();
    const resize = new ResizeObserver(refresh);
    resize.observe(host || document.documentElement);
    let content: Element[] = [];
    const observeContent = () => {
      const next = host ? Array.from(host.children) : [document.body];
      for (const child of content)
        if (!next.includes(child as HTMLElement)) resize.unobserve(child);
      for (const child of next)
        if (!content.includes(child)) resize.observe(child);
      content = next;
    };
    observeContent();
    const clip = host?.closest<HTMLElement>("[data-scroll-clip]");
    if (clip) resize.observe(clip);
    // Content size changes belong to ResizeObserver. Watching every descendant
    // mutation here used to remeasure all rails for every editor / AI text update.
    const mutation = new MutationObserver(() => {
      observeContent();
      schedule();
    });
    mutation.observe(host || document.body, {
      childList: true,
    });
    document.addEventListener("scroll", scroll, {
      capture: true,
      passive: true,
    });
    window.addEventListener("resize", refresh);
    window.addEventListener(SCROLLBARS_REFRESH_EVENT, refresh);
    // Covers the final position after a disclosure's initial transform settles.
    const settled = window.setTimeout(schedule, 450);
    return () => {
      resize.disconnect();
      mutation.disconnect();
      cancelAnimationFrame(frame);
      clearTimeout(settled);
      document.removeEventListener("scroll", scroll, true);
      window.removeEventListener("resize", refresh);
      window.removeEventListener(SCROLLBARS_REFRESH_EVENT, refresh);
      if (originalSelect.current !== null)
        document.documentElement.style.userSelect = originalSelect.current;
    };
  }, [host, read, updateOffset]);

  const scrollTo = (offset: number) => {
    const geometry = measured.current;
    const target = host || document.documentElement;
    const value = Math.min(
      Math.max(0, offset),
      Math.max(0, geometry.extent - geometry.viewport),
    );
    // Explicitly bypass smooth anchor scrolling while dragging or using the keys.
    target.scrollTo(
      vertical
        ? { top: value, behavior: "instant" }
        : { left: value, behavior: "instant" },
    );
    updateOffset();
  };
  const start = (event: PointerEvent<HTMLDivElement>) => {
    const geometry = measured.current;
    if (event.button !== 0 || geometry.travel <= 0) return;
    event.preventDefault();
    const bounds = event.currentTarget.getBoundingClientRect();
    const pointer = vertical ? event.clientY : event.clientX;
    const local = pointer - (vertical ? bounds.top : bounds.left);
    const onThumb =
      local >= geometry.position && local <= geometry.position + geometry.thumb;
    const offset = onThumb
      ? geometry.offset
      : (Math.max(0, Math.min(geometry.travel, local - geometry.thumb / 2)) /
          geometry.travel) *
        (geometry.extent - geometry.viewport);
    if (!onThumb) scrollTo(offset);
    drag.current = {
      pointer,
      offset,
      max: geometry.extent - geometry.viewport,
      travel: geometry.travel,
    };
    originalSelect.current = document.documentElement.style.userSelect;
    document.documentElement.style.userSelect = "none";
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
  };
  const move = (event: PointerEvent<HTMLDivElement>) => {
    const active = drag.current;
    if (!active) return;
    scrollTo(
      active.offset +
        (((vertical ? event.clientY : event.clientX) - active.pointer) /
          active.travel) *
          active.max,
    );
  };
  const stop = () => {
    drag.current = null;
    setDragging(false);
    if (originalSelect.current !== null) {
      document.documentElement.style.userSelect = originalSelect.current;
      originalSelect.current = null;
    }
  };
  const keyboard = (event: KeyboardEvent<HTMLDivElement>) => {
    const geometry = measured.current;
    const deltas: Record<string, number> = {
      ArrowDown: 40,
      ArrowRight: 40,
      ArrowUp: -40,
      ArrowLeft: -40,
      PageDown: geometry.viewport * 0.85,
      PageUp: -geometry.viewport * 0.85,
      Home: -geometry.extent,
      End: geometry.extent,
    };
    if (event.key in deltas) {
      event.preventDefault();
      scrollTo(geometry.offset + deltas[event.key]);
    }
  };
  if (!geometry.visible || (host && unavailable(host))) return null;
  const container =
    host?.closest("dialog[open]") ||
    document.fullscreenElement ||
    document.body;
  const railStyle = vertical
    ? {
        top: geometry.top,
        left: geometry.left + geometry.width - 12,
        height: geometry.height,
        width: 12,
      }
    : {
        top: geometry.top + geometry.height - 12,
        left: geometry.left,
        width: geometry.width,
        height: 12,
      };
  const thumbStyle = vertical
    ? {
        height: geometry.thumb,
        transform: `translateY(${geometry.position}px)`,
      }
    : {
        width: geometry.thumb,
        transform: `translateX(${geometry.position}px)`,
      };
  return createPortal(
    <div
      ref={rail}
      className={`custom-scrollbar custom-scrollbar-${axis} ${isPage ? "custom-scrollbar-page" : "custom-scrollbar-local"} ${dragging ? "dragging" : ""}`}
      style={railStyle}
      onPointerDown={start}
      onPointerMove={move}
      onPointerUp={stop}
      onPointerCancel={stop}
      onLostPointerCapture={stop}
    >
      <div
        ref={thumbElement}
        className="custom-scrollbar-thumb"
        role="scrollbar"
        aria-label={t(vertical ? "vertical" : "horizontal", {
          region: isPage
            ? t("page")
            : (host?.getAttribute("data-custom-scroll") ?? t("content")) ||
              t("content"),
        })}
        aria-orientation={vertical ? "vertical" : "horizontal"}
        aria-valuemin={0}
        aria-valuemax={Math.max(
          0,
          Math.round(geometry.extent - geometry.viewport),
        )}
        aria-valuenow={Math.round(geometry.offset)}
        tabIndex={0}
        onKeyDown={keyboard}
        style={thumbStyle}
      />
    </div>,
    container,
  );
}

/** Explicit hosts avoid scanning every element or creating layout wrappers around motion components. */
export function CustomScrollbars() {
  const native = useMediaQuery(touchMotionQuery, true);
  return native ? null : <OverlayScrollbars />;
}

function OverlayScrollbars() {
  const [hosts, setHosts] = useState<HTMLElement[]>([]);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setReady(true);
    let frame = 0;
    let pendingMembership = false;
    const collect = () => {
      const next = Array.from(
        document.querySelectorAll<HTMLElement>("[data-custom-scroll]"),
      );
      setHosts((previous) =>
        previous.length === next.length &&
        previous.every((host, index) => host === next[index])
          ? previous
          : next,
      );
      // Class changes (e.g. opening the mobile sidebar) may change a host's scrollability.
      window.dispatchEvent(new Event(SCROLLBARS_REFRESH_EVENT));
    };
    collect();
    const observer = new MutationObserver((records) => {
      const relevant = records.filter(
        (record) =>
          !(
            record.target instanceof Element &&
            record.target.closest(".custom-scrollbar")
          ),
      );
      const membership = relevant.some(
        (record) =>
          (record.type === "attributes" &&
            record.attributeName === "data-custom-scroll") ||
          [...record.addedNodes, ...record.removedNodes].some(
            (node) =>
              node instanceof Element &&
              (node.matches("[data-custom-scroll]") ||
                node.querySelector("[data-custom-scroll]")),
          ),
      );
      const removed = relevant.some((record) =>
        [...record.removedNodes].some((node) => node instanceof Element),
      );
      const attributes = relevant.some(
        (record) =>
          record.type === "attributes" &&
          record.target instanceof Element &&
          [...hides.keys()].some((host) =>
            (record.target as Element).contains(host),
          ),
      );
      if (!membership && !removed && !attributes) return;
      // Hide detached / closing hosts in the mutation microtask, before paint.
      for (const [host, callbacks] of hides)
        if (unavailable(host)) callbacks.forEach((hide) => hide());
      if (membership && removed) {
        pendingMembership = false;
        collect();
        return;
      }
      if (!membership && !attributes) return;
      pendingMembership ||= membership;
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        if (pendingMembership) {
          pendingMembership = false;
          collect();
        } else window.dispatchEvent(new Event(SCROLLBARS_REFRESH_EVENT));
      });
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: [
        "data-custom-scroll",
        "class",
        "open",
        "hidden",
        "inert",
        "data-closing",
      ],
    });
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, []);
  if (!ready) return null;
  return (
    <>
      <Scrollbar host={null} axis="vertical" />
      <Scrollbar host={null} axis="horizontal" />
      {hosts.map((host) => (
        <ScrollHost key={hostId(host)} host={host} />
      ))}
    </>
  );
}
function ScrollHost({ host }: { host: HTMLElement }) {
  return (
    <>
      <Scrollbar host={host} axis="vertical" />
      {host.getAttribute("data-scroll-axis") !== "vertical" && (
        <Scrollbar host={host} axis="horizontal" />
      )}
    </>
  );
}
