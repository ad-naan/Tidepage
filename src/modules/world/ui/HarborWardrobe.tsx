"use client";

import { useTranslations } from "next-intl";
import { X } from "lucide-react";
import { Button, IconButton } from "@/shared/ui/button/Button";
import { Select } from "@/shared/ui/select/Select";
import { Field } from "@/shared/ui/field/Field";
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
  type ColorName =
    | keyof typeof avatarColors.coat
    | keyof typeof avatarColors.skin
    | keyof typeof avatarColors.hair;
  const colors = (
    key: "coat" | "skin" | "hairColor",
    palette: Record<string, string>,
  ) => (
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
      {colors("skin", avatarColors.skin)}
      {colors("hairColor", avatarColors.hair)}
      <Field id="harbor-hair" label={t("wardrobe.hairStyle")}>
        <Select
          value={appearance.hairStyle}
          label={t("wardrobe.hairStyle")}
          options={(["crop", "bob", "waves"] as const).map((value) => ({
            value,
            label: t(`hair.${value}`),
          }))}
          onValueChange={(hairStyle) => onChange({ ...appearance, hairStyle })}
        />
      </Field>
      <Field id="harbor-accessory" label={t("wardrobe.accessory")}>
        <Select
          value={appearance.accessory}
          label={t("wardrobe.accessory")}
          options={(["satchel", "scarf", "none"] as const).map((value) => ({
            value,
            label: t(`accessories.${value}`),
          }))}
          onValueChange={(accessory) => onChange({ ...appearance, accessory })}
        />
      </Field>
      <p className={styles.localNote}>{t("wardrobe.saved")}</p>
      <Button variant="primary" onClick={onClose}>
        {t("wardrobe.done")}
      </Button>
    </section>
  );
}
