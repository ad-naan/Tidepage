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
import { ArrowUpRight, LayoutDashboard, LogOut, UserRound } from "lucide-react";
import type { Principal } from "@/modules/identity/domain/principal";
import type { OAuthProviderId } from "@/modules/identity/domain/oauth";
import { Dialog } from "@/shared/ui/dialog/Dialog";
import { Button } from "@/shared/ui/button/Button";
import { Link } from "@/shared/i18n/navigation";
import { apiSend } from "@/shared/http/client";
import { OAuthLoginOptions } from "./OAuthLoginOptions";
import { AuthorNameText } from "./AuthorSignature";
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
    setOpen(true);
    url.searchParams.delete("login");
    window.history.replaceState(null, "", url.pathname + url.search + url.hash);
  }, []);

  const signOut = useCallback(async () => {
    setSigningOut(true);
    try {
      await apiSend("/api/v1/auth/session", "DELETE");
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
        <Dialog
          title={t("title")}
          size="compact"
          onClose={() => setOpen(false)}
        >
          <div className={styles.content}>
            {principal ? (
              <div className={styles.account}>
                <div className={styles.identityRow}>
                  <span className={styles.avatar} aria-hidden>
                    <UserRound size={21} strokeWidth={1.4} />
                  </span>
                  <div>
                    <span className={styles.accountLabel}>
                      {t("signedInAs")}
                    </span>
                    <strong className={styles.name}>
                      <AuthorNameText text={principal.displayName} />
                    </strong>
                  </div>
                </div>
                {["admin", "author"].includes(principal.role) && (
                  <Link
                    href="/admin"
                    className={styles.workbench}
                    onClick={() => setOpen(false)}
                  >
                    <LayoutDashboard size={16} aria-hidden />
                    <span>{t("workbench")}</span>
                    <ArrowUpRight size={16} aria-hidden />
                  </Link>
                )}
                <Button
                  className={styles.logout}
                  variant="quiet"
                  onClick={signOut}
                  busy={signingOut}
                >
                  <LogOut size={16} aria-hidden />
                  {signingOut ? t("signingOut") : t("logout")}
                </Button>
              </div>
            ) : (
              <OAuthLoginOptions
                providers={providers}
                returnTo={pathname ?? "/"}
              />
            )}
            {failed && (
              <p role="alert" className={styles.error}>
                {t("loginFailed")}
              </p>
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
    <Button
      className="login-trigger"
      aria-label={principal ? t("title") : t("login")}
      aria-haspopup="dialog"
      onClick={openLogin}
    >
      <UserRound size={15} />
      <span>
        <AuthorNameText text={principal?.displayName ?? t("login")} />
      </span>
    </Button>
  );
}

export function useIdentity() {
  return useContext(IdentityContext);
}
