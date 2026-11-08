"use client";
import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { X, Send, MessagesSquare } from "lucide-react";
import { useIdentity } from "@/modules/identity/ui/IdentityProvider";
import { Button, IconButton } from "@/shared/ui/button/Button";
import { Input } from "@/shared/ui/field/Input";
import { Disclosure } from "@/shared/ui/disclosure/Disclosure";
import { apiSend } from "@/shared/http/client";
import type { GuideAnswer } from "../domain/harbor-guide";
import type { HarborDestination } from "../domain/coast-harbor";
import {
  converseCompanions,
  type CompanionTurn,
} from "../domain/companion-conversation";
import type { useHarborSpeech } from "./HarborSpeech";
import styles from "./HarborGuide.module.css";

function waitForSpeech(
  milliseconds: number,
  signal: AbortSignal,
): Promise<void> {
  return new Promise((resolve, reject) => {
    signal.throwIfAborted();
    const abort = () => {
      clearTimeout(timer);
      reject(signal.reason);
    };
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", abort);
      resolve();
    }, milliseconds);
    signal.addEventListener("abort", abort, { once: true });
  });
}

export function HarborGuide({
  open,
  enabled,
  night,
  onClose,
  place,
  speech,
  onListening,
}: {
  open: boolean;
  enabled: boolean;
  night: boolean;
  onClose: () => void;
  place: HarborDestination | null;
  speech: ReturnType<typeof useHarborSpeech>;
  onListening: (listening: boolean) => void;
}) {
  const locale = useLocale();
  const t = useTranslations("world.harbor.companion");
  const s = useTranslations("world.harbor.speech");
  const { principal, openLogin } = useIdentity();
  const [question, setQuestion] = useState("");
  const [turns, setTurns] = useState<
    { question: string; answer: GuideAnswer }[]
  >([]);
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState(false);
  const request = useRef<AbortController | null>(null);
  const latest = useRef({ night, t, speech, onClose });
  latest.current = { night, t, speech, onClose };
  useEffect(() => {
    if (open)
      latest.current.speech.speak(
        "otter",
        latest.current.t(
          latest.current.night ? "greetingNight" : "greetingDay",
        ),
      );
    else {
      setBusy(false);
      setListening(false);
      onListening(false);
    }
    return () => {
      request.current?.abort();
      request.current = null;
      latest.current.speech.clear();
    };
  }, [open, onListening]);
  useEffect(() => {
    const visibility = () => {
      if (document.hidden && request.current) {
        request.current.abort();
        request.current = null;
        setBusy(false);
        setListening(false);
        onListening(false);
      }
    };
    document.addEventListener("visibilitychange", visibility);
    return () => document.removeEventListener("visibilitychange", visibility);
  }, [onListening]);
  function stop() {
    request.current?.abort();
    request.current = null;
    setBusy(false);
    setListening(false);
    onListening(false);
  }
  async function ask() {
    const text = question.trim();
    if (!text || !principal || !enabled || request.current) return;
    const controller = new AbortController();
    request.current = controller;
    setBusy(true);
    setError(false);
    speech.speak("self", text);
    try {
      const answer = await apiSend<GuideAnswer>(
        "/api/v1/world/guide",
        "POST",
        {
          locale,
          place,
          companionId: "otter",
          context: { night },
          question: text,
          turns: turns
            .slice(-3)
            .map(({ question, answer }) => ({ question, reply: answer.reply })),
        },
        { signal: controller.signal },
      );
      if (!controller.signal.aborted) {
        setTurns((history) => [
          ...history.slice(-2),
          { question: text, answer },
        ]);
        setQuestion("");
        speech.speak("otter", answer.reply, answer);
      }
    } catch {
      if (!controller.signal.aborted) setError(true);
    } finally {
      if (request.current === controller) {
        request.current = null;
        setBusy(false);
      }
    }
  }
  async function listen() {
    if (!principal || !enabled || request.current) return;
    const controller = new AbortController();
    request.current = controller;
    setBusy(true);
    setListening(true);
    onListening(true);
    setError(false);
    speech.clear();
    const topic = question.trim() || s(night ? "nightTopic" : "dayTopic");
    try {
      await converseCompanions({
        signal: controller.signal,
        next: (turns, signal) =>
          apiSend<CompanionTurn>(
            "/api/v1/world/companions",
            "POST",
            { locale, night, topic, turns },
            { signal },
          ),
        speak: (turn) => {
          speech.speak(turn.speaker, turn.reply);
        },
        wait: waitForSpeech,
      });
    } catch {
      if (!controller.signal.aborted) setError(true);
    } finally {
      if (request.current === controller) {
        request.current = null;
        setBusy(false);
        setListening(false);
        onListening(false);
      }
    }
  }
  if (!open) return null;
  return (
    <section
      className={styles.bar}
      aria-label={t("conversation")}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.stopPropagation();
          onClose();
        }
      }}
    >
      <div className={styles.row}>
        {!enabled ? (
          <span>{t("unavailable")}</span>
        ) : !principal ? (
          <Button
            onClick={() => {
              onClose();
              openLogin();
            }}
          >
            {t("login")}
          </Button>
        ) : listening ? (
          <span className={styles.listening} role="status">
            {s("listening")}
          </span>
        ) : (
          <form
            className={styles.composer}
            onSubmit={(event) => {
              event.preventDefault();
              void ask();
            }}
          >
            <Input
              aria-label={t("question")}
              placeholder={t("question")}
              value={question}
              maxLength={180}
              disabled={busy}
              onChange={(event) => setQuestion(event.target.value)}
            />
            <IconButton
              type="submit"
              aria-label={t("ask")}
              disabled={busy || !question.trim()}
            >
              <Send size={18} />
            </IconButton>
          </form>
        )}
        {enabled &&
          principal &&
          (busy ? (
            <Button onClick={stop}>{t("stop")}</Button>
          ) : (
            <Button
              aria-label={s("listen")}
              title={s("listen")}
              onClick={() => void listen()}
            >
              <MessagesSquare size={20} />
              {s("listenShort")}
            </Button>
          ))}
        <IconButton autoFocus aria-label={s("close")} onClick={onClose}>
          <X size={18} />
        </IconButton>
      </div>
      {error && (
        <p className={styles.note} role="alert">
          {t("error")}
        </p>
      )}
      {busy && !listening && (
        <p className={styles.note} role="status">
          {t("thinking")}
        </p>
      )}
      <Disclosure summary={t("about")} className={styles.about}>
        <p>{s("aiPrivacy")}</p>
      </Disclosure>
    </section>
  );
}
