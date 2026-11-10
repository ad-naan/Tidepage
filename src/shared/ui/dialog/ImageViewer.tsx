"use client";

import {
  useLayoutEffect,
  useId,
  useRef,
  useState,
  type PointerEvent,
  type ReactNode,
} from "react";
import {
  Info,
  Maximize,
  Minus,
  Plus,
  RotateCcw,
  RotateCw,
  SlidersHorizontal,
} from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { Button, IconButton } from "@/shared/ui/button/Button";
import { PencilFrame } from "@/shared/ui/drawing/CoastalMarks";
import { MediaImage } from "@/shared/ui/image/MediaImage";
import { Dialog } from "./Dialog";
import styles from "./ImageViewer.module.css";

type Point = { x: number; y: number };
type Size = { width: number; height: number };
type View = Point & { zoom: number; rotation: number };
const initialView: View = { x: 0, y: 0, zoom: 1, rotation: 0 };
const emptySize: Size = { width: 0, height: 0 };
const maxZoom = 8;
const step = Math.SQRT2;

function fitSize(image: Size, stage: Size, rotation: number): Size {
  if (!image.width || !stage.width) return emptySize;
  const sideways = rotation % 180 !== 0;
  const scale = Math.min(
    1,
    stage.width / (sideways ? image.height : image.width),
    stage.height / (sideways ? image.width : image.height),
  );
  return { width: image.width * scale, height: image.height * scale };
}

function constrain(view: View, image: Size, stage: Size): View {
  const fitted = fitSize(image, stage, view.rotation);
  const sideways = view.rotation % 180 !== 0;
  const maxX = Math.max(
    0,
    ((sideways ? fitted.height : fitted.width) * view.zoom - stage.width) / 2,
  );
  const maxY = Math.max(
    0,
    ((sideways ? fitted.width : fitted.height) * view.zoom - stage.height) / 2,
  );
  return {
    ...view,
    x: Math.min(maxX, Math.max(-maxX, view.x)),
    y: Math.min(maxY, Math.max(-maxY, view.y)),
  };
}

function zoomAt(view: View, factor: number, from: Point, to = from): View {
  const zoom = Math.min(maxZoom, Math.max(1, view.zoom * factor));
  const ratio = zoom / view.zoom;
  return {
    ...view,
    zoom,
    x: to.x + (view.x - from.x) * ratio,
    y: to.y + (view.y - from.y) * ratio,
  };
}

const center = { x: 0, y: 0 };
const midpoint = (a: Point, b: Point) => ({
  x: (a.x + b.x) / 2,
  y: (a.y + b.y) / 2,
});
const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

type ViewerDetails = { label: string; content: ReactNode };

export function ImageViewer({
  src,
  alt,
  title,
  onClose,
  children,
  navigation,
  details,
  aspectRatio,
  previewSizes,
}: {
  src: string;
  alt: string;
  title: string;
  onClose: () => void;
  children?: ReactNode;
  navigation?: ReactNode;
  details?: ViewerDetails;
  aspectRatio?: number;
  previewSizes?: string;
}) {
  return (
    <Dialog
      title={title}
      onClose={onClose}
      surface="viewer"
      layout={details ? "folio" : "default"}
    >
      <ViewerCanvas
        src={src}
        alt={alt}
        navigation={navigation}
        details={details}
        aspectRatio={aspectRatio}
        previewSizes={previewSizes}
      >
        {children}
      </ViewerCanvas>
    </Dialog>
  );
}

function ViewerCanvas({
  src,
  alt,
  children,
  navigation,
  details,
  aspectRatio,
  previewSizes,
}: {
  src: string;
  alt: string;
  children?: ReactNode;
  navigation?: ReactNode;
  details?: ViewerDetails;
  aspectRatio?: number;
  previewSizes?: string;
}) {
  const t = useTranslations("ui.imageViewer");
  const format = useFormatter();
  const stageRef = useRef<HTMLDivElement>(null);
  const pointers = useRef(new Map<number, Point>());
  const [decoded, setDecoded] = useState<{ src: string; size: Size }>();
  const image = decoded?.src === src ? decoded.size : emptySize;
  const [stage, setStage] = useState(emptySize);
  const [view, setView] = useState(initialView);
  const [failedSource, setFailedSource] = useState<string>();
  const failed = failedSource === src;
  const [dragging, setDragging] = useState(false);
  const [panel, setPanel] = useState<"details" | "adjust" | null>(null);
  const detailsId = useId();
  const toolsId = useId();
  const fitted = fitSize(image, stage, view.rotation);
  const displayed = constrain(view, image, stage);

  useLayoutEffect(() => {
    pointers.current.clear();
    setView(initialView);
    setDragging(false);
  }, [src]);

  useLayoutEffect(() => {
    const element = stageRef.current!;
    const observer = new ResizeObserver(([{ contentRect }]) =>
      setStage({ width: contentRect.width, height: contentRect.height }),
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  function update(change: (current: View) => View) {
    setView((current) =>
      constrain(change(constrain(current, image, stage)), image, stage),
    );
  }

  function position(event: { clientX: number; clientY: number }) {
    const rect = stageRef.current!.getBoundingClientRect();
    return {
      x: event.clientX - rect.left - rect.width / 2,
      y: event.clientY - rect.top - rect.height / 2,
    };
  }

  useLayoutEffect(() => {
    const element = stageRef.current!;
    if (!image.width) return;
    function wheel(event: WheelEvent) {
      event.preventDefault();
      const units =
        event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 160 : 1;
      const point = position(event);
      setView((current) =>
        constrain(
          zoomAt(
            constrain(current, image, stage),
            Math.exp((-event.deltaY * units) / 300),
            point,
          ),
          image,
          stage,
        ),
      );
    }
    element.addEventListener("wheel", wheel, { passive: false });
    return () => element.removeEventListener("wheel", wheel);
  }, [image, stage]);

  function start(event: PointerEvent<HTMLDivElement>) {
    if (!image.width || event.button !== 0 || pointers.current.size >= 2)
      return;
    event.currentTarget.setPointerCapture(event.pointerId);
    pointers.current.set(event.pointerId, position(event));
    setDragging(true);
  }
  function move(event: PointerEvent<HTMLDivElement>) {
    const previous = pointers.current.get(event.pointerId);
    if (!previous) return;
    const current = position(event);
    pointers.current.set(event.pointerId, current);
    const other = [...pointers.current].find(
      ([id]) => id !== event.pointerId,
    )?.[1];
    if (other) {
      const factor =
        distance(current, other) / Math.max(1, distance(previous, other));
      update((view) =>
        zoomAt(
          view,
          factor,
          midpoint(previous, other),
          midpoint(current, other),
        ),
      );
    } else {
      update((view) => ({
        ...view,
        x: view.x + current.x - previous.x,
        y: view.y + current.y - previous.y,
      }));
    }
  }
  function end(event: PointerEvent<HTMLDivElement>) {
    pointers.current.delete(event.pointerId);
    setDragging(pointers.current.size > 0);
  }
  const ready = !!image.width;
  const zoom = (factor: number) =>
    update((view) => zoomAt(view, factor, center));
  const rotate = (by: number) =>
    update((view) => ({
      ...view,
      ...center,
      rotation: (view.rotation + by) % 360,
    }));
  const reset = () =>
    update((view) => ({ ...initialView, rotation: view.rotation }));
  const toolProps = { size: "sm" as const, className: styles.tool };
  const tools = (
    <div
      id={toolsId}
      className={styles.tools}
      role="group"
      aria-label={t("tools")}
    >
      <IconButton
        {...toolProps}
        aria-label={t("zoomOut")}
        title={t("zoomOut")}
        disabled={!ready || view.zoom <= 1}
        onClick={() => zoom(1 / step)}
      >
        <Minus size={17} />
      </IconButton>
      <span className={styles.zoom} aria-live="polite">
        {format.number(view.zoom, { style: "percent" })}
      </span>
      <IconButton
        {...toolProps}
        aria-label={t("zoomIn")}
        title={t("zoomIn")}
        disabled={!ready || view.zoom >= maxZoom}
        onClick={() => zoom(step)}
      >
        <Plus size={17} />
      </IconButton>
      <span className={styles.divider} aria-hidden="true" />
      <IconButton
        {...toolProps}
        aria-label={t("rotateLeft")}
        title={t("rotateLeft")}
        disabled={!ready}
        onClick={() => rotate(-90)}
      >
        <RotateCcw size={17} />
      </IconButton>
      <IconButton
        {...toolProps}
        aria-label={t("rotateRight")}
        title={t("rotateRight")}
        disabled={!ready}
        onClick={() => rotate(90)}
      >
        <RotateCw size={17} />
      </IconButton>
      <IconButton
        {...toolProps}
        aria-label={t("fit")}
        title={t("fit")}
        disabled={!ready}
        onClick={reset}
      >
        <Maximize size={16} />
      </IconButton>
    </div>
  );
  return (
    <div
      className={styles.viewer}
      data-compact={!!details}
      data-panel={panel}
      data-portrait={
        aspectRatio !== undefined && aspectRatio < 1 ? "" : undefined
      }
    >
      <div
        ref={stageRef}
        className={styles.stage}
        data-zoomed={view.zoom > 1}
        data-dragging={dragging}
        data-loading={!ready && !failed}
        tabIndex={0}
        role="region"
        aria-label={t("canvas")}
        onPointerDown={start}
        onPointerMove={move}
        onLostPointerCapture={end}
        onDoubleClick={(event) => {
          const point = position(event);
          update((view) =>
            zoomAt(view, view.zoom > 1 ? 1 / view.zoom : 2, point),
          );
        }}
        onKeyDown={(event) => {
          if (!ready || event.ctrlKey || event.metaKey || event.altKey) return;
          switch (event.key) {
            case "+":
            case "=":
              zoom(step);
              break;
            case "-":
              zoom(1 / step);
              break;
            case "0":
              reset();
              break;
            case "r":
            case "R":
              rotate(event.shiftKey ? -90 : 90);
              break;
            case "ArrowLeft":
              update((view) => ({ ...view, x: view.x + 48 }));
              break;
            case "ArrowRight":
              update((view) => ({ ...view, x: view.x - 48 }));
              break;
            case "ArrowUp":
              update((view) => ({ ...view, y: view.y + 48 }));
              break;
            case "ArrowDown":
              update((view) => ({ ...view, y: view.y - 48 }));
              break;
            default:
              return;
          }
          event.preventDefault();
        }}
      >
        {failed ? (
          <p role="status">{t("failed")}</p>
        ) : (
          <>
            <MediaImage
              className={styles.original}
              src={src}
              alt={alt}
              draggable={false}
              onReady={(element) => {
                setFailedSource(undefined);
                setDecoded({
                  src,
                  size: {
                    width: element.naturalWidth,
                    height: element.naturalHeight,
                  },
                });
              }}
              onUnavailable={() => setFailedSource(src)}
              style={{
                visibility: fitted.width ? undefined : "hidden",
                width: fitted.width,
                height: fitted.height,
                transform: `translate3d(${displayed.x}px, ${displayed.y}px, 0) rotate(${view.rotation}deg) scale(${view.zoom})`,
              }}
            />
            {previewSizes && (
              <MediaImage
                className={styles.preview}
                src={src}
                alt=""
                sizes={previewSizes}
                aria-hidden="true"
                draggable={false}
              />
            )}
          </>
        )}
      </div>
      {details ? (
        <>
          <div className={styles.compactDock} data-navigation={!!navigation}>
            {navigation && (
              <div className={styles.navigation}>{navigation}</div>
            )}
            <div className={styles.dockActions}>
              <Button
                className={styles.dockAction}
                aria-label={t("adjust")}
                title={t("adjust")}
                aria-expanded={panel === "adjust"}
                aria-controls={panel === "adjust" ? toolsId : undefined}
                onClick={() => setPanel(panel === "adjust" ? null : "adjust")}
              >
                <SlidersHorizontal size={17} aria-hidden="true" />
                <span className={styles.adjustLabel}>{t("adjustLabel")}</span>
              </Button>
              <Button
                className={styles.dockAction}
                aria-expanded={panel === "details"}
                aria-controls={panel === "details" ? detailsId : undefined}
                onClick={() => setPanel(panel === "details" ? null : "details")}
              >
                <Info size={16} aria-hidden="true" />
                {details.label}
              </Button>
            </div>
          </div>
          {panel === "adjust" && (
            <div className={styles.adjustment}>{tools}</div>
          )}
          {panel === "details" && (
            <section
              id={detailsId}
              aria-label={details.label}
              className={styles.information}
            >
              <PencilFrame kind="note" className={styles.informationPaper} />
              <div className={styles.informationBody}>{details.content}</div>
            </section>
          )}
        </>
      ) : (
        <div className={styles.dock}>
          {navigation && <div className={styles.navigation}>{navigation}</div>}
          {tools}
          {children && <div className={styles.caption}>{children}</div>}
        </div>
      )}
    </div>
  );
}
