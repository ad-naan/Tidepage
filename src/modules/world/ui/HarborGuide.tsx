"use client";
import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useIdentity } from "@/modules/identity/ui/IdentityProvider";
import { Button } from "@/shared/ui/button/Button";
import { Textarea } from "@/shared/ui/field/Textarea";
import { Link } from "@/shared/i18n/navigation";
import { apiSend } from "@/shared/http/client";
import type { GuideAnswer } from "@/modules/world/domain/harbor-guide";
import type { HarborDestination } from "@/modules/world/domain/coast-harbor";
import styles from "./HarborView.module.css";

export function HarborGuide({
  place,
  walk,
}: {
  place: HarborDestination | null;
  walk: (destination: HarborDestination) => void;
}) {
  const locale = useLocale();
  const t = useTranslations("world.harbor.companion");
  const destinations = useTranslations("world.harbor.destinations");
  const { principal, openLogin } = useIdentity();
  const [question, setQuestion] = useState("");
  const [turns, setTurns] = useState<
    { question: string; answer: GuideAnswer }[]
  >([]);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);
  async function ask() {
    const text = question.trim();
    if (!text || !principal || request.current) return;
    const controller = new AbortController();
    request.current = controller;
    setBusy(true);
    setError(false);
    try {
      const answer = await apiSend<GuideAnswer>(
        "/api/v1/world/guide",
        "POST",
        {
          locale,
          place,
          question: text,
          turns: turns
            .slice(-3)
            .map(({ question, answer }) => ({ question, reply: answer.reply })),
        },
        { signal: controller.signal },
      );
      if (!controller.signal.aborted) {
        setTurns((history) => [
          ...history.slice(-3),
          { question: text, answer },
        ]);
        setQuestion("");
      }
    } catch {
      if (!controller.signal.aborted) setError(true);
    } finally {
      request.current = null;
      setBusy(false);
    }
  }
  return (
    <section className={styles.guideCompanion} aria-label={t("title")}>
      <h3>{t("title")}</h3>
      <p>{t("intro")}</p>
      {principal ? (
        <>
          <div
            className={styles.guideTurns}
            role="log"
            aria-label={t("conversation")}
          >
            {turns.map(({ question, answer }, index) => (
              <div key={index}>
                <strong>{question}</strong>
                <p>{answer.reply}</p>
                {answer.destination && (
                  <Button
                    variant="quiet"
                    onClick={() => walk(answer.destination!)}
                  >
                    {t("walk", {
                      destination: destinations(answer.destination),
                    })}
                  </Button>
                )}
                {answer.links.length > 0 && (
                  <ul>
                    {answer.links.map(({ href, title }) => (
                      <li key={href}>
                        <Link href={href}>{title}</Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void ask();
            }}
          >
            <Textarea
              aria-label={t("question")}
              placeholder={t("question")}
              value={question}
              rows={2}
              maxLength={400}
              disabled={busy}
              onChange={(event) => setQuestion(event.target.value)}
            />
            <Button type="submit" busy={busy} disabled={!question.trim()}>
              {t("ask")}
            </Button>
            {busy && (
              <Button onClick={() => request.current?.abort()}>
                {t("stop")}
              </Button>
            )}
          </form>
          {error && <p role="alert">{t("error")}</p>}
        </>
      ) : (
        <Button onClick={openLogin}>{t("login")}</Button>
      )}
    </section>
  );
}
