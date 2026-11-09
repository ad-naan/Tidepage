"use client";

import { useFormatter, useTranslations } from "next-intl";
import { MapPin } from "lucide-react";
import type { GalleryPhoto } from "@/modules/content/domain/gallery";
import { PencilLine } from "@/shared/ui/drawing/CoastalMarks";
import styles from "./GalleryView.module.css";

export function GalleryPhotoDetails({ photo }: { photo: GalleryPhoto }) {
  const t = useTranslations("gallery.capture");
  const format = useFormatter();
  const { capture, caption, place, width, height } = photo;
  const number = (value: number) =>
    format.number(value, { maximumFractionDigits: 2, useGrouping: false });
  const seconds = capture?.exposureSeconds;
  const reciprocal = seconds ? Math.round(1 / seconds) : 0;
  const exposure =
    seconds &&
    (reciprocal >= 2 && Math.abs(1 / reciprocal / seconds - 1) < 0.02
      ? t("fractionSeconds", { denominator: number(reciprocal) })
      : t("seconds", {
          value: format.number(seconds, { maximumFractionDigits: 6 }),
        }));
  const settings = [
    [
      t("focalLength"),
      capture?.focalLength &&
        t("millimeters", { value: number(capture.focalLength) }),
    ],
    [t("aperture"), capture?.aperture && `f/${number(capture.aperture)}`],
    [t("exposure"), exposure],
    [t("iso"), capture?.iso && number(capture.iso)],
  ].filter(([, value]) => !!value);
  return (
    <div className={styles.photoDetails}>
      <header className={styles.detailsHeader}>
        <h2>{t("title")}</h2>
        {place && (
          <span className={styles.photoPlace}>
            <MapPin size={13} aria-hidden="true" />
            {place}
          </span>
        )}
      </header>
      {caption && <p className={styles.photoCaption}>{caption}</p>}
      <PencilLine kind="fold" className={styles.detailsRule} />
      {(capture?.camera || capture?.lens) && (
        <dl className={styles.equipment}>
          {capture.camera && (
            <div>
              <dt>{t("camera")}</dt>
              <dd>{capture.camera}</dd>
            </div>
          )}
          {capture.lens && (
            <div>
              <dt>{t("lens")}</dt>
              <dd>{capture.lens}</dd>
            </div>
          )}
        </dl>
      )}
      {!!settings.length && (
        <dl className={styles.capture}>
          {settings.map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      )}
      <dl className={styles.dimensions}>
        <dt>{t("dimensions")}</dt>
        <dd>
          {number(width)} × {number(height)}
        </dd>
      </dl>
    </div>
  );
}
