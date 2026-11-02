"use client";
import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { apiSend } from "@/shared/http/client";
import { Button } from "@/shared/ui/button/Button";
import { Input } from "@/shared/ui/field/Input";
import { Field } from "@/shared/ui/field/Field";
import styles from "./AuthorLoginView.module.css";

export function AuthorLoginView() {
  const t = useTranslations("admin.access");
  const [key, setKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  async function login(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(false);
    try {
      await apiSend("/api/v1/author/session", "POST", { key });
      window.location.reload();
    } catch {
      setError(true);
      setBusy(false);
    }
  }
  return (
    <main className={styles.page}>
      <form onSubmit={login} className={styles.form}>
        <h1>{t("title")}</h1>
        <p>{t("help")}</p>
        <Field id="author-key" label={t("key")}>
          <Input
            id="author-key"
            type="password"
            autoComplete="current-password"
            value={key}
            onChange={(event) => setKey(event.target.value)}
            required
          />
        </Field>
        {error && <p role="alert">{t("error")}</p>}
        <Button type="submit" variant="primary" busy={busy}>
          {t("signIn")}
        </Button>
      </form>
    </main>
  );
}
