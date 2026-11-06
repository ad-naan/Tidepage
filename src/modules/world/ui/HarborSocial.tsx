"use client";
import { DateTime } from "@/shared/ui/typography/DateTime";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/shared/ui/button/Button";
import { Dialog } from "@/shared/ui/dialog/Dialog";
import { apiGet } from "@/shared/http/client";
import { useIdentity } from "@/modules/identity/ui/IdentityProvider";
import type { CoastMemoryPage } from "@/shared/contracts/coast-memories";
import type { useCoastConnection } from "./useCoastConnection";
import styles from "./HarborSocial.module.css";

type Network = ReturnType<typeof useCoastConnection>;
export function HarborSocial({
  network,
  panel,
  onClose,
  onError,
  version,
}: {
  network: Network;
  panel: "company" | "journal" | null;
  onClose: () => void;
  onError: (error: unknown) => void;
  version: number;
}) {
  const t = useTranslations("world.harbor.social");
  const connection = useTranslations("world.harbor.network");
  const places = useTranslations("world.harbor.places");
  const { principal, openLogin } = useIdentity();
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(0);
  const [page, setPage] = useState<CoastMemoryPage | null>(null);
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const photo = network.photo;
  const name = (id: string) =>
    network.players.find((p) => p.id === id)?.name ??
    t("traveler", { code: id.slice(0, 4) });
  useEffect(() => {
    if (photo?.state !== "scheduled" && photo?.state !== "pending") return;
    const update = () => setNow(network.serverNow());
    update();
    const timer = setInterval(update, 250);
    return () => clearInterval(timer);
  }, [photo?.id, photo?.state, network.serverNow]);
  useEffect(() => {
    if (panel !== "journal" || !principal) return;
    const controller = new AbortController();
    setLoading(true);
    setFailed(false);
    setPage(null);
    void apiGet<CoastMemoryPage>("/api/v1/world/memories", {
      signal: controller.signal,
    })
      .then(setPage)
      .catch(() => {
        if (!controller.signal.aborted) setFailed(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [panel, principal, version, attempt]);
  async function action(work: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    try {
      await work();
    } catch (error) {
      onError(error);
    } finally {
      setBusy(false);
    }
  }
  async function more() {
    if (!page?.next || loading) return;
    setLoading(true);
    try {
      const next = await apiGet<CoastMemoryPage>(
        `/api/v1/world/memories?after=${encodeURIComponent(page.next)}`,
      );
      setPage({ items: [...page.items, ...next.items], next: next.next });
    } catch (error) {
      onError(error);
    } finally {
      setLoading(false);
    }
  }
  return (
    <>
      {photo && (photo.state === "pending" || photo.state === "scheduled") && (
        <section className={styles.invitation} aria-label={t("invitation")}>
          {photo.state === "pending" ? (
            <>
              <p role="status">
                {photo.to === network.selfId
                  ? t("invited", { name: name(photo.from) })
                  : t("waiting", { name: name(photo.to) })}
              </p>
              <p className={styles.note}>{t("consent")}</p>
              <div className={styles.buttons}>
                {photo.to === network.selfId && (
                  <Button
                    busy={busy}
                    onClick={() =>
                      action(() => network.respond(photo.id, "accept"))
                    }
                  >
                    {t("accept")}
                  </Button>
                )}
                <Button
                  disabled={busy}
                  onClick={() =>
                    action(() =>
                      network.respond(
                        photo.id,
                        photo.to === network.selfId ? "decline" : "cancel",
                      ),
                    )
                  }
                >
                  {t(photo.to === network.selfId ? "decline" : "cancel")}
                </Button>
              </div>
            </>
          ) : (
            <>
              <p role="status">
                {t("countdown", {
                  count: Math.max(1, Math.ceil((photo.shootAt! - now) / 1000)),
                })}
              </p>
              <Button
                disabled={busy}
                onClick={() =>
                  action(() => network.respond(photo.id, "cancel"))
                }
              >
                {t("cancel")}
              </Button>
            </>
          )}
        </section>
      )}
      {panel === "company" && (
        <Dialog title={t("company")} onClose={onClose}>
          <div className={styles.content}>
            <p role="status">
              {network.phase === "online"
                ? connection("count", { count: network.count })
                : connection(network.phase)}
            </p>
            <Button
              disabled={!network.configured}
              aria-pressed={network.phase === "online"}
              onClick={() =>
                ["online", "connecting", "reconnecting"].includes(network.phase)
                  ? network.setEnabled(false)
                  : network.retry()
              }
            >
              {connection(
                ["online", "connecting", "reconnecting"].includes(network.phase)
                  ? "leave"
                  : "join",
              )}
            </Button>
            <p className={styles.note}>{t("hostHint")}</p>
            {network.phase !== "online" ? (
              <p>{t("offline")}</p>
            ) : network.players.filter((p) => p.id !== network.selfId)
                .length === 0 ? (
              <p>{t("emptyCompany")}</p>
            ) : (
              <ul className={styles.list}>
                {network.players
                  .filter((p) => p.id !== network.selfId)
                  .sort((a, b) => Number(b.host) - Number(a.host))
                  .map((player) => (
                    <li key={player.id}>
                      <div>
                        <strong>{name(player.id)}</strong>
                        {player.host && (
                          <span className={styles.badge}>{t("host")}</span>
                        )}
                      </div>
                      <div className={styles.buttons}>
                        <Button
                          disabled={photo?.state === "scheduled"}
                          onClick={() => {
                            network.approach(player.id);
                            onClose();
                          }}
                        >
                          {t("approach")}
                        </Button>
                        <Button
                          disabled={
                            busy ||
                            photo?.state === "pending" ||
                            photo?.state === "scheduled"
                          }
                          onClick={() =>
                            action(async () => {
                              await network.invite(player.id);
                              onClose();
                            })
                          }
                        >
                          {t("invite")}
                        </Button>
                      </div>
                    </li>
                  ))}
              </ul>
            )}
          </div>
        </Dialog>
      )}
      {panel === "journal" && (
        <Dialog title={t("journal")} onClose={onClose}>
          <div className={styles.content}>
            <p className={styles.note}>{t("journalHint")}</p>
            {!principal ? (
              <>
                <p>{t("loginHint")}</p>
                <Button
                  onClick={() => {
                    onClose();
                    openLogin();
                  }}
                >
                  {t("login")}
                </Button>
              </>
            ) : (
              <>
                {loading && !page && <p role="status">{t("loading")}</p>}
                {failed && (
                  <>
                    <p role="alert">{t("loadFailed")}</p>
                    <Button onClick={() => setAttempt((value) => value + 1)}>
                      {t("retry")}
                    </Button>
                  </>
                )}
                {page &&
                  (page.items.length === 0 ? (
                    <p>{t("emptyJournal")}</p>
                  ) : (
                    <ul className={styles.list}>
                      {page.items.map((memory) => (
                        <li key={memory.id}>
                          <div>
                            <strong>
                              {t(
                                memory.kind === "photo"
                                  ? "photoMemory"
                                  : "visitMemory",
                                { place: places(`${memory.place}.name`) },
                              )}
                            </strong>
                            {memory.withHost && (
                              <span className={styles.badge}>
                                {t("withHost")}
                              </span>
                            )}
                          </div>
                          <DateTime value={memory.occurredAt} mode="datetime" />
                          <span className={styles.note}>
                            {t("companions", { count: memory.companionCount })}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ))}
                {page?.next && (
                  <Button busy={loading} onClick={more}>
                    {t("more")}
                  </Button>
                )}
              </>
            )}
          </div>
        </Dialog>
      )}
    </>
  );
}
