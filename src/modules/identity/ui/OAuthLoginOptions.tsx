"use client";
import { useTranslations } from "next-intl";
import { ArrowUpRight, Github, GitBranch } from "lucide-react";
import type { OAuthProviderId } from "../domain/oauth";
import { Anchor } from "@/shared/ui/link/Anchor";
import styles from "./IdentityProvider.module.css";

export function OAuthLoginOptions({
  providers,
  returnTo,
}: {
  providers: readonly OAuthProviderId[];
  returnTo: string;
}) {
  const t = useTranslations("identity");
  return (
    <div className={styles.providers}>
      <div className={styles.welcome}>
        <h2>{t("welcome")}</h2>
        <p>{t("loginHelp")}</p>
      </div>
      <p>{providers.length ? t("choose") : t("unavailable")}</p>
      {providers.map((provider) => (
        <Anchor
          key={provider}
          className={styles.providerLink}
          href={`/api/v1/auth/${provider}?returnTo=${encodeURIComponent(returnTo)}`}
        >
          {provider === "github" ? (
            <Github size={18} aria-hidden />
          ) : (
            <GitBranch size={18} aria-hidden />
          )}
          <span>{t(`${provider}Login`)}</span>
          <ArrowUpRight size={15} aria-hidden />
        </Anchor>
      ))}
    </div>
  );
}
