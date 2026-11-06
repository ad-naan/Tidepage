"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import type { OAuthProviderId } from "../domain/oauth";
import type { Principal } from "../domain/principal";
import { apiSend } from "@/shared/http/client";
import { Button } from "@/shared/ui/button/Button";
import { Link } from "@/shared/i18n/navigation";
import { OAuthLoginOptions } from "./OAuthLoginOptions";
import styles from "./AuthorLoginView.module.css";

export function AuthorLoginView({
  providers,
  principal,
}: {
  providers: readonly OAuthProviderId[];
  principal: Principal | null;
}) {
  const t = useTranslations("admin.access");
  const pathname = usePathname();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("login") !== "error") return;
    setError(true);
    url.searchParams.delete("login");
    window.history.replaceState(null, "", url.pathname + url.search + url.hash);
  }, []);
  async function signOut() {
    setBusy(true);
    setError(false);
    try {
      await apiSend("/api/v1/auth/session", "DELETE");
      window.location.reload();
    } catch {
      setError(true);
      setBusy(false);
    }
  }
  return (
    <main className={styles.page}>
      <section className={styles.form} aria-labelledby="author-login-title">
        <h1 id="author-login-title">{t("title")}</h1>
        <p>{t("help")}</p>
        {principal ? (
          <>
            <p role="status">
              {t("forbidden", { name: principal.displayName })}
            </p>
            <Button busy={busy} onClick={signOut}>
              {t("switchAccount")}
            </Button>
          </>
        ) : (
          <OAuthLoginOptions providers={providers} returnTo={pathname ?? "/"} />
        )}
        {error && <p role="alert">{t("error")}</p>}
        <Link href="/">{t("backToSite")}</Link>
      </section>
    </main>
  );
}
