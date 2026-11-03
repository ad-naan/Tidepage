"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { LogOut, UserRound } from "lucide-react";
import type { Principal } from "@/modules/identity/domain/principal";
import type { OAuthProviderId } from "@/modules/identity/domain/oauth";
import { Dialog } from "@/shared/ui/dialog/Dialog";
import { Button } from "@/shared/ui/button/Button";
import { Anchor } from "@/shared/ui/link/Anchor";
import styles from "./IdentityProvider.module.css";

const IdentityContext = createContext<{
  principal: Principal | null;
  openLogin: () => void;
}>({ principal: null, openLogin: () => {} });

export function IdentityProvider({
  children,
  principal,
  providers,
}: {
  children: ReactNode;
  principal: Principal | null;
  providers: readonly OAuthProviderId[];
}) {
  const t = useTranslations("identity");
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [failed, setFailed] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  // OAuth 回调失败时以 ?login=error 结尾跳回，读取后清理地址并提示。
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("login") !== "error") return;
    setFailed(true);
    url.searchParams.delete("login");
    window.history.replaceState(
      null,
      "",
      url.pathname +
        (url.searchParams.toString() ? `?${url.searchParams}` : ""),
    );
  }, []);

  const signOut = useCallback(async () => {
    setSigningOut(true);
    try {
      const response = await fetch("/api/v1/auth/session", {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("logout failed");
      window.location.reload();
    } catch {
      setSigningOut(false);
      setFailed(true);
    }
  }, []);

  return (
    <IdentityContext.Provider
      value={{ principal, openLogin: () => setOpen(true) }}
    >
      {children}
      {open && (
        <Dialog title={t("title")} onClose={() => setOpen(false)}>
          <div className="login-content">
            {principal ? (
              <div className={styles.account}>
                <p>
                  <span className={styles.accountLabel}>{t("signedInAs")}</span>
                  {principal.displayName}
                </p>
                <Button onClick={signOut} disabled={signingOut}>
                  <LogOut size={14} />
                  {signingOut ? t("signingOut") : t("logout")}
                </Button>
              </div>
            ) : providers.length > 0 ? (
              <div className={styles.providers}>
                <p>{t("choose")}</p>
                {providers.map((provider) => (
                  <Anchor
                    key={provider}
                    className={styles.providerLink}
                    href={`/api/v1/auth/${provider}?returnTo=${encodeURIComponent(pathname ?? "/")}`}
                  >
                    {provider === "github" ? t("githubLogin") : t("giteeLogin")}
                  </Anchor>
                ))}
              </div>
            ) : (
              <p>{t("unavailable")}</p>
            )}
            {failed && !principal && (
              <p className={styles.error}>{t("loginFailed")}</p>
            )}
          </div>
        </Dialog>
      )}
    </IdentityContext.Provider>
  );
}

export function LoginTrigger() {
  const { principal, openLogin } = useContext(IdentityContext);
  const t = useTranslations("identity");
  return (
    <Button className="login-trigger" onClick={openLogin}>
      <UserRound size={15} />
      <span>{principal?.displayName ?? t("login")}</span>
    </Button>
  );
}
