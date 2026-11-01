"use client";
import { createContext, useContext, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Github, ArrowRight, Check, LogOut, UserRound } from "lucide-react";
import { Dialog } from "@/shared/ui/dialog/Dialog";
import { Button } from "@/shared/ui/button/Button";
const IdentityContext = createContext({ loggedIn: false, openLogin: () => {} });
export function usePreviewIdentity() {
  return useContext(IdentityContext);
}
export function PreviewIdentityProvider({ children }: { children: ReactNode }) {
  const t = useTranslations("identity");
  const [open, setOpen] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [notice, setNotice] = useState(false);
  return (
    <IdentityContext.Provider
      value={{
        loggedIn,
        openLogin: () => {
          setNotice(false);
          setOpen(true);
        },
      }}
    >
      {children}
      {open && (
        <Dialog
          title={loggedIn ? t("titleLoggedIn") : t("title")}
          onClose={() => setOpen(false)}
        >
          <div className="login-illustration">
            <span className="postage-stamp">
              a<span>✳</span>
            </span>
            <span className="postmark">
              {t("postmark1")}
              <br />
              {t("postmark2")}
            </span>
          </div>
          <div className="login-content">
            <h2>{loggedIn ? t("welcomeBack") : t("welcome")}</h2>
            <p>{loggedIn ? t("introLoggedIn") : t("intro")}</p>
            <Button className="github-button" onClick={() => setNotice(true)}>
              <Github size={19} />
              {loggedIn ? t("guest") : t("continue")}
              <ArrowRight size={16} />
            </Button>
            {notice && (
              <div className="login-notice" role="status">
                {t("notice")}
              </div>
            )}
            <div className="login-privileges">
              <span>
                <Check size={12} />
                {t("save")}
              </span>
              <span>
                <Check size={12} />
                {t("discuss")}
              </span>
              <span>
                <Check size={12} />
                {t("trace")}
              </span>
            </div>
            <Button
              className="preview-login-link"
              onClick={() => {
                setLoggedIn(!loggedIn);
                setOpen(false);
              }}
            >
              {loggedIn ? (
                <>
                  <LogOut size={13} />
                  {t("exitDemo")}
                </>
              ) : (
                <>
                  {t("previewLogin")} <ArrowRight size={13} />
                </>
              )}
            </Button>
            <small>{t("disclaimer")}</small>
          </div>
        </Dialog>
      )}
    </IdentityContext.Provider>
  );
}
export function LoginTrigger() {
  const { loggedIn, openLogin } = usePreviewIdentity();
  const t = useTranslations("identity");
  return (
    <Button
      className={`login-trigger ${loggedIn ? "logged-in" : ""}`}
      aria-label={loggedIn ? t("viewAccount") : t("login")}
      onClick={openLogin}
    >
      {loggedIn ? (
        <span className="mini-avatar">{t("guestBadge")}</span>
      ) : (
        <>
          <UserRound size={15} />
          <span>{t("login")}</span>
        </>
      )}
    </Button>
  );
}
