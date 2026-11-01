"use client";
import { LoadingSkeleton } from "@/shared/ui/loading/LoadingSkeleton";
import { useEffect, useState } from "react";
import { useLocale, useMessages, useTranslations } from "next-intl";
import { z } from "zod";
import { locales, localeRegistry, type Locale } from "@/shared/i18n/config";
import { readLocalRecord, writeLocalRecord } from "@/shared/lib/browser-store";
import { Field } from "@/shared/ui/field/Field";
import { Input } from "@/shared/ui/field/Input";
import { Textarea } from "@/shared/ui/field/Textarea";
import { Select } from "@/shared/ui/select/Select";
import { Button } from "@/shared/ui/button/Button";
import { Dialog } from "@/shared/ui/dialog/Dialog";
import { MediaPicker } from "@/modules/media/ui/admin/MediaPicker";
import { AssetImage } from "@/modules/media/ui/admin/AssetImage";
import { FilterTabs } from "@/shared/ui/filter-tabs/FilterTabs";
import { UnsavedChangesGuard } from "@/shared/ui/navigation/UnsavedChangesGuard";
import { useNotice } from "@/shared/ui/feedback/NoticeProvider";
import styles from "./SiteSettingsView.module.css";
const schema = z.object({
  revision: z.number(),
  translations: z.record(z.string(), z.record(z.string(), z.string())),
});
export function SiteSettingsView() {
  const t = useTranslations("admin");
  const copy = useMessages().admin.settings;
  const uiLocale = useLocale();
  const { notify } = useNotice();
  const [locale, setLocale] = useState<Locale>(uiLocale);
  const [tab, setTab] = useState("profile");
  const [value, setValue] = useState<z.infer<typeof schema> | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [assetField, setAssetField] = useState<string | null>(null);
  useEffect(() => {
    readLocalRecord("site-settings")
      .then((data) =>
        setValue(
          data === undefined
            ? {
                revision: 0,
                translations: Object.fromEntries(
                  locales.map((locale) => [locale, {}]),
                ),
              }
            : schema.parse(data),
        ),
      )
      .catch(() => setError(t("storageError")));
  }, []);
  useEffect(() => {
    const before = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", before);
    return () => window.removeEventListener("beforeunload", before);
  }, [dirty]);
  const fields = {
    profile: [
      "name",
      "identity",
      "intro",
      "avatarAssetId",
      "github",
      "gitee",
      "contact",
    ],
    basic: [
      "siteName",
      "siteDescription",
      "seoTitle",
      "seoDescription",
      "shareAssetId",
    ],
    home: [
      "heroTitle",
      "heroDescription",
      "featuredSlugs",
      "navigationOrder",
      "footer",
    ],
    about: ["aboutTitle", "aboutSections", "signature"],
  };
  return (
    <>
      <UnsavedChangesGuard dirty={dirty} />
      <header className={styles.heading}>
        <div>
          <h1>{t("nav.site")}</h1>
          <p>{t("settings.description")}</p>
        </div>
        <Button
          variant="quiet"
          busy={busy}
          disabled={!value}
          onClick={async () => {
            if (!value) return;
            setBusy(true);
            try {
              await navigator.locks.request("tidepage:settings", async () => {
                const current = await readLocalRecord("site-settings");
                if (
                  current &&
                  schema.parse(current).revision !== value.revision
                )
                  throw new Error("CONFLICT");
                const saved = { ...value, revision: value.revision + 1 };
                await writeLocalRecord("site-settings", saved);
                setValue(saved);
              });
              setDirty(false);
              notify({ title: t("settings.saved"), tone: "success" });
            } catch {
              setError(t("editor.conflict"));
            } finally {
              setBusy(false);
            }
          }}
        >
          {t("editor.save")}
        </Button>
      </header>
      <FilterTabs
        label={t("settings.tabsLabel")}
        value={tab}
        onChange={setTab}
        options={Object.keys(fields).map((value) => ({
          value,
          label: (copy.tabs as Record<string, string>)[value],
        }))}
      />
      {error && <p role="alert">{error}</p>}
      {!value && !error && <LoadingSkeleton variant="rows" />}
      {value && (
        <div className={styles.fields}>
          <Select
            value={locale}
            label={t("editor.contentLocale")}
            options={locales.map((value) => ({
              value,
              label: localeRegistry[value].name,
            }))}
            onValueChange={setLocale}
          />
          {(fields as Record<string, string[]>)[tab].map((key) => (
            <Field
              key={`${locale}:${key}`}
              id={`site-${key}`}
              label={(copy.fields as Record<string, string>)[key]}
            >
              {key.endsWith("AssetId") ? (
                <Button
                  onClick={() => setAssetField(key)}
                  className={styles.assetButton}
                  variant="quiet"
                >
                  {value.translations[locale]?.[key] && (
                    <AssetImage
                      id={value.translations[locale][key]}
                      alt={value.translations[locale]?.[`${key}Alt`] ?? ""}
                    />
                  )}
                  <span>{t("editor.cover")}</span>
                </Button>
              ) : [
                  "intro",
                  "siteDescription",
                  "heroDescription",
                  "aboutSections",
                  "footer",
                ].includes(key) ? (
                <Textarea
                  value={value.translations[locale]?.[key] ?? ""}
                  rows={4}
                  onChange={(e) => {
                    setValue({
                      ...value,
                      translations: {
                        ...value.translations,
                        [locale]: {
                          ...value.translations[locale],
                          [key]: e.target.value,
                        },
                      },
                    });
                    setDirty(true);
                  }}
                />
              ) : (
                <Input
                  value={value.translations[locale]?.[key] ?? ""}
                  onChange={(e) => {
                    setValue({
                      ...value,
                      translations: {
                        ...value.translations,
                        [locale]: {
                          ...value.translations[locale],
                          [key]: e.target.value,
                        },
                      },
                    });
                    setDirty(true);
                  }}
                />
              )}
            </Field>
          ))}
        </div>
      )}
      {assetField && value && (
        <Dialog title={t("nav.media")} wide onClose={() => setAssetField(null)}>
          <MediaPicker
            onSelect={(asset, alt) => {
              setValue({
                ...value,
                translations: {
                  ...value.translations,
                  [locale]: {
                    ...value.translations[locale],
                    [assetField]: asset.id,
                    [`${assetField}Alt`]: alt,
                  },
                },
              });
              setDirty(true);
              setAssetField(null);
            }}
          />
        </Dialog>
      )}
    </>
  );
}
