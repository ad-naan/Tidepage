"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent,
  type KeyboardEvent,
} from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";

type Axis = "vertical" | "horizontal";
// Internal layout refreshes are not browser resizes. Other overlays may close on resize.
const SCROLLBARS_REFRESH_EVENT = "tidepage:scrollbars-refresh";
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
  const drag = useRef<{
    pointer: number;
    offset: number;
    max: number;
    travel: number;
  } | null>(null);
  const originalSelect = useRef<string | null>(null);
  const isPage = host === null;
  const read = useCallback(() => {
    const target = host || document.documentElement;
    if (host && !host.isConnected) return;
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
    setGeometry((previous) =>
      Object.keys(next).every(
        (key) =>
          previous[key as keyof Geometry] === next[key as keyof Geometry],
      )
        ? previous
        : next,
    );
  }, [host, vertical]);

  useEffect(() => {
    let frame = 0;
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(read);
    };
    read();
    const resize = new ResizeObserver(schedule);
    resize.observe(host || document.documentElement);
    resize.observe(host?.firstElementChild || document.body);
    const clip = host?.closest<HTMLElement>("[data-scroll-clip]");
    if (clip) resize.observe(clip);
    const mutation = new MutationObserver(schedule);
    mutation.observe(host || document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });
    document.addEventListener("scroll", schedule, true);
    window.addEventListener("resize", schedule);
    window.addEventListener(SCROLLBARS_REFRESH_EVENT, schedule);
    // Covers the final position after a disclosure's initial transform settles.
    const settled = window.setTimeout(schedule, 450);
    return () => {
      resize.disconnect();
      mutation.disconnect();
      cancelAnimationFrame(frame);
      clearTimeout(settled);
      document.removeEventListener("scroll", schedule, true);
      window.removeEventListener("resize", schedule);
      window.removeEventListener(SCROLLBARS_REFRESH_EVENT, schedule);
      if (originalSelect.current !== null)
        document.documentElement.style.userSelect = originalSelect.current;
    };
  }, [host, read]);

  const scrollTo = (offset: number) => {
    const target = host || document.documentElement;
    const value = Math.min(
      Math.max(0, offset),
      Math.max(0, geometry.extent - geometry.viewport),
    );
    // Direct assignment keeps dragging synchronous even when the page uses smooth anchor scrolling.
    if (vertical) target.scrollTop = value;
    else target.scrollLeft = value;
    read();
  };
  const start = (event: PointerEvent<HTMLDivElement>) => {
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
  if (!geometry.visible) return null;
  const container = host?.closest("dialog") || document.body;
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
  const [hosts, setHosts] = useState<HTMLElement[]>([]);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setReady(true);
    let frame = 0;
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
      if (
        !records.some(
          (record) =>
            record.type === "attributes" ||
            [...record.addedNodes, ...record.removedNodes].some(
              (node) =>
                node instanceof Element &&
                !node.classList.contains("custom-scrollbar"),
            ),
        )
      )
        return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(collect);
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["data-custom-scroll", "class", "open"],
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
      {hosts.map((host, index) => (
        <ScrollHost key={index} host={host} />
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
