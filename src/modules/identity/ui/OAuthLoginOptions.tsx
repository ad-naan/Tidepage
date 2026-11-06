"use client";
import { useTranslations } from "next-intl";
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
      <p>{providers.length ? t("choose") : t("unavailable")}</p>
      {providers.map((provider) => (
        <Anchor
          key={provider}
          className={styles.providerLink}
          href={`/api/v1/auth/${provider}?returnTo=${encodeURIComponent(returnTo)}`}
        >
          {t(`${provider}Login`)}
        </Anchor>
      ))}
    </div>
  );
}
