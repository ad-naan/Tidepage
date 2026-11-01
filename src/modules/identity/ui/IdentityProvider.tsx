"use client";
import { createContext, useContext, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { UserRound } from "lucide-react";
import type { Principal } from "@/modules/identity/domain/principal";
import { Dialog } from "@/shared/ui/dialog/Dialog";
import { Button } from "@/shared/ui/button/Button";
const IdentityContext = createContext<{
  principal: Principal | null;
  openLogin: () => void;
}>({ principal: null, openLogin: () => {} });
export function IdentityProvider({
  children,
  principal,
}: {
  children: ReactNode;
  principal: Principal | null;
}) {
  const t = useTranslations("identity");
  const [open, setOpen] = useState(false);
  return (
    <IdentityContext.Provider
      value={{ principal, openLogin: () => setOpen(true) }}
    >
      {children}
      {open && (
        <Dialog title={t("title")} onClose={() => setOpen(false)}>
          <div className="login-content">
            {principal ? (
              <p>{principal.displayName}</p>
            ) : (
              <p>{t("unavailable")}</p>
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
