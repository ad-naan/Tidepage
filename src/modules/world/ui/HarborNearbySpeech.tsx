"use client";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { X, Send } from "lucide-react";
import { Button, IconButton } from "@/shared/ui/button/Button";
import { Input } from "@/shared/ui/field/Input";
import { useIdentity } from "@/modules/identity/ui/IdentityProvider";
import { CoastRpcError, type useCoastConnection } from "./useCoastConnection";
import styles from "./HarborGuide.module.css";

export function HarborNearbySpeech({
  network,
  onClose,
}: {
  network: ReturnType<typeof useCoastConnection>;
  onClose: () => void;
}) {
  const t = useTranslations("world.harbor.speech");
  const { principal, openLogin } = useIdentity();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<
    "rateLimited" | "loginExpired" | "failed" | null
  >(null);
  const pending = useRef<{ id: string; text: string } | null>(null);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  async function send() {
    if (!text.trim() || busy) return;
    const message =
      pending.current?.text === text.trim()
        ? pending.current
        : { id: crypto.randomUUID(), text: text.trim() };
    pending.current = message;
    setBusy(true);
    setError(null);
    try {
      await network.say(message.id, message.text);
      if (mounted.current) onClose();
    } catch (error) {
      if (mounted.current)
        setError(
          error instanceof CoastRpcError && error.code === "RATE_LIMITED"
            ? "rateLimited"
            : error instanceof CoastRpcError && error.code === "AUTH_REQUIRED"
              ? "loginExpired"
              : "failed",
        );
    } finally {
      if (mounted.current) setBusy(false);
    }
  }
  return (
    <section
      className={styles.bar}
      aria-label={t("nearby")}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.stopPropagation();
          onClose();
        }
      }}
    >
      <div className={styles.row}>
        {!principal ? (
          <Button
            onClick={() => {
              onClose();
              openLogin();
            }}
          >
            {t("login")}
          </Button>
        ) : network.phase !== "online" ? (
          <>
            <span>{t("offline")}</span>
            <Button onClick={network.retry}>{t("join")}</Button>
          </>
        ) : !network.speechReady ? (
          <span>{t("upgrade")}</span>
        ) : (
          <form
            className={styles.composer}
            onSubmit={(event) => {
              event.preventDefault();
              void send();
            }}
          >
            <Input
              autoFocus
              aria-label={t("placeholder")}
              placeholder={t("placeholder")}
              value={text}
              maxLength={180}
              disabled={busy}
              onChange={(event) => setText(event.target.value)}
            />
            <IconButton
              type="submit"
              aria-label={t("send")}
              disabled={!text.trim() || busy}
            >
              <Send size={18} />
            </IconButton>
          </form>
        )}
        <IconButton aria-label={t("close")} onClick={onClose}>
          <X size={18} />
        </IconButton>
      </div>
      <p className={styles.note} role={error ? "alert" : undefined}>
        {t(error ?? "range")}
      </p>
    </section>
  );
}
