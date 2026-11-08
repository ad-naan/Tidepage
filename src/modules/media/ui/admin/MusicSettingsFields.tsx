"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/shared/ui/button/Button";
import { Field } from "@/shared/ui/field/Field";
import { Input } from "@/shared/ui/field/Input";
import { Select } from "@/shared/ui/select/Select";
import { apiSend } from "@/shared/http/client";
import {
  musicSettingsSchema,
  type MusicSettings,
} from "@/shared/contracts/music";
import styles from "./MusicSettingsFields.module.css";

export function MusicSettingsFields({
  value,
  onChange,
}: {
  value: MusicSettings;
  onChange: (value: MusicSettings) => void;
}) {
  const t = useTranslations("admin.music");
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<{
    count: number;
    titles: string[];
  } | null>(null);
  const [error, setError] = useState("");
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  function update(patch: Partial<MusicSettings>) {
    controller.current?.abort();
    setTesting(false);
    setResult(null);
    setError("");
    onChange({ ...value, ...patch });
  }
  return (
    <div className={styles.fields}>
      <Field
        id="music-enabled"
        label={t("enabled")}
        description={t("enabledHelp")}
      >
        <Select
          label={t("enabled")}
          value={value.enabled ? "on" : "off"}
          options={[
            { value: "off", label: t("off") },
            { value: "on", label: t("on") },
          ]}
          onValueChange={(next) => update({ enabled: next === "on" })}
        />
      </Field>
      <Field id="music-server" label={t("server")}>
        <Select
          label={t("server")}
          value={value.server}
          options={[
            { value: "netease", label: t("netease") },
            { value: "tencent", label: t("tencent") },
          ]}
          onValueChange={(server) => update({ server })}
        />
      </Field>
      <Field
        id="music-playlist"
        label={t("playlistId")}
        description={t("playlistHelp")}
      >
        <Input
          value={value.playlistId}
          inputMode="numeric"
          maxLength={30}
          onChange={(event) =>
            update({ playlistId: event.target.value.trim() })
          }
        />
      </Field>
      <Field id="music-api" label={t("apiUrl")} description={t("apiHelp")}>
        <Input
          type="url"
          value={value.apiUrl}
          maxLength={2048}
          onChange={(event) => update({ apiUrl: event.target.value.trim() })}
        />
      </Field>
      <div className={styles.test}>
        <Button
          variant="quiet"
          busy={testing}
          onClick={async () => {
            const checked = musicSettingsSchema.safeParse({
              ...value,
              enabled: true,
            });
            setResult(null);
            if (!checked.success) {
              setError(t("invalid"));
              return;
            }
            controller.current?.abort();
            const request = new AbortController();
            controller.current = request;
            setError("");
            setTesting(true);
            try {
              const data = await apiSend<{ count: number; titles: string[] }>(
                "/api/v1/music/preview",
                "POST",
                checked.data,
                { signal: request.signal },
              );
              if (!request.signal.aborted) setResult(data);
            } catch {
              if (!request.signal.aborted) setError(t("failed"));
            } finally {
              if (!request.signal.aborted) setTesting(false);
            }
          }}
        >
          {testing ? t("testing") : t("test")}
        </Button>
        <p>{t("testHelp")}</p>
        {result && (
          <div role="status">
            <p>{t("success", { count: result.count })}</p>
            <ul>
              {result.titles.map((title, index) => (
                <li key={index}>{title}</li>
              ))}
            </ul>
          </div>
        )}
        {error && <p role="alert">{error}</p>}
      </div>
    </div>
  );
}
