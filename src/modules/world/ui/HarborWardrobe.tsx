"use client";

import { useTranslations } from "next-intl";
import { X } from "lucide-react";
import { Button, IconButton } from "@/shared/ui/button/Button";
import { avatarColors, type CoastAvatar } from "../domain/coast-avatar";
import styles from "./HarborView.module.css";

export function HarborWardrobe({
  appearance,
  onChange,
  onClose,
}: {
  appearance: CoastAvatar;
  onChange: (appearance: CoastAvatar) => void;
  onClose: () => void;
}) {
  const t = useTranslations("world.harbor");
  type ColorName = keyof typeof avatarColors.coat;
  const colors = (key: "coat", palette: Record<string, string>) => (
    <fieldset className={styles.palette}>
      <legend>{t(`wardrobe.${key}`)}</legend>
      <div>
        {(Object.entries(palette) as [ColorName, string][]).map(
          ([value, color]) => (
            <Button
              key={value}
              className={styles.swatch}
              style={{ "--swatch": color } as React.CSSProperties}
              aria-label={t(`colors.${value}`)}
              aria-pressed={appearance[key] === value}
              onClick={() => onChange({ ...appearance, [key]: value })}
            >
              <span aria-hidden="true" />
            </Button>
          ),
        )}
      </div>
    </fieldset>
  );
  return (
    <section className={styles.wardrobe} aria-label={t("wardrobe.title")}>
      <div className={styles.panelHeading}>
        <h2>{t("wardrobe.title")}</h2>
        <IconButton aria-label={t("close")} onClick={onClose}>
          <X size={18} />
        </IconButton>
      </div>
      <p className={styles.panelIntro}>{t("wardrobe.intro")}</p>
      {colors("coat", avatarColors.coat)}
      <p className={styles.localNote}>{t("wardrobe.saved")}</p>
      <Button variant="primary" onClick={onClose}>
        {t("wardrobe.done")}
      </Button>
    </section>
  );
}
