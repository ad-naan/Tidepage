"use client";
import { useState } from "react";
import { useLocale, useMessages, useTranslations } from "next-intl";
import { locales, localeRegistry, type Locale } from "@/shared/i18n/config";
import { updateWorkbenchRecord } from "@/shared/lib/workbench-store";
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
import {
  settingsDraftSchema,
  type SettingsDraft,
} from "@/modules/site-settings/domain/models";
import { PageDocumentEditor } from "./PageDocumentEditor";
import { SiteEditorialAssistant } from "./SiteEditorialAssistant";

const multilineFields = new Set([
  "intro",
  "siteDescription",
  "heroDescription",
  "aboutIntro",
  "siteAboutIntro",
  "footer",
]);
const fullWidthFields = new Set(["siteName", "avatarAssetId", "shareAssetId"]);
const draftOnlyFields = new Set([
  "contact",
  "featuredSlugs",
  "navigationOrder",
  "footer",
]);

export function SiteSettingsView({
  initialSettings,
  aiEnabled = false,
}: {
  initialSettings: SettingsDraft | null;
  aiEnabled?: boolean;
}) {
  const t = useTranslations("admin");
  const copy = useMessages().admin.settings;
  const uiLocale = useLocale();
  const { notify } = useNotice();
  const [locale, setLocale] = useState<Locale>(uiLocale);
  const [tab, setTab] = useState("profile");
  const [value, setValue] = useState(initialSettings);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [assetField, setAssetField] = useState<string | null>(null);
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
    about: [
      "aboutTitle",
      "aboutIdentity",
      "aboutPersonality",
      "aboutIntro",
      "aboutInterest1",
      "aboutInterestNote1",
      "aboutInterest2",
      "aboutInterestNote2",
      "aboutInterest3",
      "aboutInterestNote3",
      "aboutInterest4",
      "aboutInterestNote4",
      "aboutBody",
      "signature",
    ],
    siteAbout: ["siteAboutTitle", "siteAboutIntro", "siteAboutBody"],
  };
  function updateFields(fields: Record<string, string>) {
    setValue(
      (current) =>
        current && {
          ...current,
          translations: {
            ...current.translations,
            [locale]: { ...current.translations[locale], ...fields },
          },
        },
    );
    setDirty(true);
  }
  return (
    <div className={styles.workspace}>
      <UnsavedChangesGuard dirty={dirty} />
      <header className={styles.heading}>
        <div>
          <h1>{t("nav.site")}</h1>
          <p>{t("settings.description")}</p>
        </div>
        <Button
          variant="primary"
          busy={busy}
          disabled={!value || !dirty || uploading}
          onClick={async () => {
            if (!value) return;
            setBusy(true);
            setError("");
            try {
              const saved = await updateWorkbenchRecord(
                "site-settings",
                (current) => {
                  if (
                    current &&
                    settingsDraftSchema.parse(current).revision !==
                      value.revision
                  )
                    throw new Error("CONFLICT");
                  return { ...value, revision: value.revision + 1 };
                },
              );
              setValue(saved);
              setDirty(false);
              notify({ title: t("settings.saved"), tone: "success" });
            } catch {
              setError(t("editor.conflict"));
            } finally {
              setBusy(false);
            }
          }}
        >
          {t("settings.save")}
        </Button>
      </header>
      <section className={styles.surface} aria-label={t("settings.tabsLabel")}>
        <div className={styles.controls}>
          <FilterTabs
            label={t("settings.tabsLabel")}
            value={tab}
            onChange={setTab}
            options={Object.keys(fields).map((value) => ({
              value,
              label: (copy.tabs as Record<string, string>)[value],
            }))}
          />
          <Field id="site-content-locale" label={t("editor.contentLocale")}>
            <Select
              className={styles.locale}
              value={locale}
              label={t("editor.contentLocale")}
              options={locales.map((value) => ({
                value,
                label: localeRegistry[value].name,
              }))}
              onValueChange={setLocale}
            />
          </Field>
        </div>
        {(error || !value) && (
          <p className={styles.error} role="alert">
            {error || t("storageError")}
          </p>
        )}
        {value && (
          <div className={styles.fields} key={`${tab}:${locale}`} inert={busy}>
            {aiEnabled && tab === "basic" && (
              <div className={styles.full}>
                <SiteEditorialAssistant
                  locale={locale}
                  fields={value.translations[locale]}
                  apply={({ seoTitle, seoDescription }) => {
                    updateFields({ seoTitle, seoDescription });
                  }}
                />
              </div>
            )}
            {(fields as Record<string, string[]>)[tab].map((key) =>
              key === "aboutBody" || key === "siteAboutBody" ? (
                <div key={key} className={styles.full}>
                  <PageDocumentEditor
                    label={(copy.fields as Record<string, string>)[key]}
                    value={value.translations[locale]?.[key] ?? ""}
                    legacy={
                      value.translations[locale]?.[
                        key === "aboutBody"
                          ? "aboutSections"
                          : "siteAboutSections"
                      ]
                    }
                    onChange={(content) => updateFields({ [key]: content })}
                    onUploading={setUploading}
                  />
                </div>
              ) : (
                <div
                  key={key}
                  className={
                    multilineFields.has(key) || fullWidthFields.has(key)
                      ? styles.full
                      : undefined
                  }
                >
                  <Field
                    id={`site-${key}`}
                    label={(copy.fields as Record<string, string>)[key]}
                    description={
                      draftOnlyFields.has(key)
                        ? t("settings.draftOnly")
                        : undefined
                    }
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
                            alt={
                              value.translations[locale]?.[`${key}Alt`] ?? ""
                            }
                          />
                        )}
                        <span>{t("editor.cover")}</span>
                      </Button>
                    ) : multilineFields.has(key) ? (
                      <Textarea
                        value={value.translations[locale]?.[key] ?? ""}
                        rows={4}
                        onChange={(e) =>
                          updateFields({ [key]: e.target.value })
                        }
                      />
                    ) : (
                      <Input
                        value={value.translations[locale]?.[key] ?? ""}
                        onChange={(e) =>
                          updateFields({ [key]: e.target.value })
                        }
                      />
                    )}
                  </Field>
                  {key.endsWith("AssetId") &&
                    value.translations[locale]?.[key] && (
                      <Button
                        className={styles.removeAsset}
                        size="sm"
                        onClick={() =>
                          updateFields({ [key]: "", [`${key}Alt`]: "" })
                        }
                      >
                        {t("settings.removeImage")}
                      </Button>
                    )}
                </div>
              ),
            )}
          </div>
        )}
      </section>
      {assetField && value && (
        <Dialog title={t("nav.media")} wide onClose={() => setAssetField(null)}>
          <MediaPicker
            onSelect={(asset, alt) => {
              updateFields({
                [assetField]: asset.id,
                [`${assetField}Alt`]: alt,
              });
              setAssetField(null);
            }}
          />
        </Dialog>
      )}
    </div>
  );
}
