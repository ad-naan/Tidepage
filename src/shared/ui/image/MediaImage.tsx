"use client";

import { getImageProps } from "next/image";
import { ImageOff } from "lucide-react";
import {
  useLayoutEffect,
  useRef,
  useState,
  type ComponentProps,
  type CSSProperties,
} from "react";
import { isUploadedAssetId } from "@/shared/contracts/asset-path";
import styles from "./MediaImage.module.css";

type ImageProps = Omit<
  ComponentProps<"img">,
  "alt" | "src" | "srcSet" | "ref" | "onLoad" | "onError"
> & {
  src: string;
  alt: string;
  onReady?: (image: HTMLImageElement) => void;
  onUnavailable?: () => void;
};

/** Opt in to a right-sized upload by supplying its rendered sizes. Originals and remote images stay direct. */
export function MediaImage(props: ImageProps) {
  return <ImageSource key={`${props.src}|${props.sizes ?? ""}`} {...props} />;
}

function ImageSource({ src, alt, sizes, onUnavailable, ...props }: ImageProps) {
  const [original, setOriginal] = useState(false);
  const responsive =
    !original && sizes && isUploadedAssetId(src) && !/\.gif$/i.test(src)
      ? getImageProps({ src, alt, fill: true, sizes }).props
      : null;
  return (
    <DecodedImage
      key={original ? "original" : "preferred"}
      {...props}
      alt={alt}
      src={responsive?.src ?? src}
      srcSet={responsive?.srcSet}
      sizes={responsive ? sizes : undefined}
      onUnavailable={responsive ? () => setOriginal(true) : onUnavailable}
    />
  );
}

function DecodedImage({
  onReady,
  onUnavailable,
  className,
  decoding = "async",
  ...props
}: ImageProps & { srcSet?: string }) {
  const ref = useRef<HTMLImageElement>(null);
  const callbacks = useRef({ onReady, onUnavailable });
  callbacks.current = { onReady, onUnavailable };
  const settled = useRef(false);
  const [state, setState] = useState<
    "initial" | "pending" | "ready" | "reveal" | "error"
  >("initial");

  useLayoutEffect(() => {
    const image = ref.current;
    if (!image) return;
    // A cached or already painted image should never disappear during hydration.
    if (image.complete && image.naturalWidth) {
      settled.current = true;
      setState("ready");
      callbacks.current.onReady?.(image);
    } else if (image.complete && image.currentSrc) {
      setState("error");
      callbacks.current.onUnavailable?.();
    } else setState("pending");
  }, []);

  return (
    <img
      {...props}
      ref={ref}
      decoding={decoding}
      className={`${styles.image}${className ? ` ${className}` : ""}`}
      data-media-state={state}
      onLoad={({ currentTarget: image }) => {
        const source = image.currentSrc;
        void image
          .decode()
          .catch(() => {})
          .then(() => {
            if (
              ref.current !== image ||
              source !== image.currentSrc ||
              !image.naturalWidth
            )
              return;
            if (!settled.current) {
              settled.current = true;
              setState("reveal");
              callbacks.current.onReady?.(image);
            }
          });
      }}
      onError={() => {
        setState("error");
        callbacks.current.onUnavailable?.();
      }}
    />
  );
}

/** Paper surface for photos, including a quiet failure mark that preserves the footprint. */
export function ImageFrame({
  className,
  imageClassName,
  fit = "natural",
  ...props
}: Omit<ImageProps, "className"> & {
  className?: string;
  imageClassName?: string;
  fit?: "natural" | "cover" | "contain";
}) {
  const { width, height } = props;
  const ratio =
    fit === "natural" && width && height
      ? ({ "--media-ratio": `${width} / ${height}` } as CSSProperties)
      : undefined;
  return (
    <span
      className={`${styles.frame}${className ? ` ${className}` : ""}`}
      style={ratio}
      data-fit={fit}
    >
      <MediaImage {...props} className={imageClassName} />
      <span className={styles.unavailable} aria-hidden="true">
        <ImageOff size={21} strokeWidth={1.35} />
      </span>
    </span>
  );
}
