"use client";
import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, GripVertical, ListOrdered } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Dialog } from "@/shared/ui/dialog/Dialog";
import { Button, IconButton } from "@/shared/ui/button/Button";
import { Select } from "@/shared/ui/select/Select";
import { LoadingSkeleton } from "@/shared/ui/loading/LoadingSkeleton";
import { useNotice } from "@/shared/ui/feedback/NoticeProvider";
import { locales, localeRegistry, type Locale } from "@/shared/i18n/config";
import { apiGet, apiSend, ApiClientError } from "@/shared/http/client";
import type {
  PublicListKind,
  PublicListOrder,
} from "@/shared/contracts/public-list-order";
import styles from "./PublicListOrderButton.module.css";

const endpoint = "/api/v1/public-list-order";
const languages = locales.map((value) => ({
  value,
  label: localeRegistry[value].name,
}));

export function PublicListOrderButton({
  kind,
  disabled,
}: {
  kind: PublicListKind;
  disabled?: boolean;
}) {
  const t = useTranslations("admin.publicOrder");
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        variant="quiet"
        disabled={disabled}
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
      >
        <ListOrdered size={15} aria-hidden="true" />
        {t("title")}
      </Button>
      {open && <OrderDialog kind={kind} close={() => setOpen(false)} />}
    </>
  );
}

function OrderDialog({
  kind,
  close,
}: {
  kind: PublicListKind;
  close: () => void;
}) {
  const t = useTranslations("admin.publicOrder");
  const initialLocale = useLocale();
  const { notify } = useNotice();
  const [locale, setLocale] = useState<Locale>(initialLocale);
  const [snapshot, setSnapshot] = useState<PublicListOrder>();
  const [items, setItems] = useState<PublicListOrder["items"]>([]);
  const [drag, setDrag] = useState<string>();
  const [drop, setDrop] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<
    "loadFailed" | "saveFailed" | "conflict"
  >();
  const [attempt, setAttempt] = useState(0);
  const dirty =
    !!snapshot &&
    items.some(({ id }, index) => id !== snapshot.items[index].id);
  useEffect(() => {
    const controller = new AbortController();
    const query = new URLSearchParams({ kind, locale });
    void apiGet<PublicListOrder>(`${endpoint}?${query}`, {
      signal: controller.signal,
    })
      .then((data) => {
        if (controller.signal.aborted) return;
        setSnapshot(data);
        setItems(data.items);
      })
      .catch(() => {
        if (!controller.signal.aborted) setError("loadFailed");
      });
    return () => controller.abort();
  }, [kind, locale, attempt]);

  function reset() {
    setSnapshot(undefined);
    setItems([]);
    setError(undefined);
  }
  function move(from: number, to: number) {
    if (busy || from < 0 || to < 0 || to >= items.length || from === to) return;
    setItems((previous) => {
      const next = [...previous];
      next.splice(to, 0, ...next.splice(from, 1));
      return next;
    });
  }
  async function save() {
    if (!snapshot || !dirty || busy) return;
    setBusy(true);
    setError(undefined);
    try {
      await apiSend(endpoint, "PUT", {
        kind,
        locale,
        revision: snapshot.revision,
        ids: items.map(({ id }) => id),
      });
      notify({ title: t("saved"), tone: "success" });
      close();
    } catch (failure) {
      setError(
        failure instanceof ApiClientError && failure.status === 409
          ? "conflict"
          : "saveFailed",
      );
      setBusy(false);
    }
  }

  return (
    <Dialog title={t("title")} onClose={close} dismissible={!busy}>
      <div className={styles.header}>
        <p>{t("description")}</p>
        <Select
          label={t("language")}
          value={locale}
          options={languages}
          disabled={busy || dirty}
          onValueChange={(next) => {
            reset();
            setLocale(next);
          }}
        />
      </div>
      {error && (
        <div className={styles.error}>
          <p role="alert">{t(error)}</p>
          {error !== "saveFailed" && (
            <Button
              variant="quiet"
              size="sm"
              onClick={() => {
                reset();
                setAttempt((value) => value + 1);
              }}
            >
              {t("reload")}
            </Button>
          )}
        </div>
      )}
      {!snapshot && !error && <LoadingSkeleton variant="rows" />}
      {snapshot && items.length === 0 && (
        <p className={styles.empty}>{t("empty")}</p>
      )}
      {items.length > 0 && (
        <ol className={styles.list}>
          {items.map(({ id, title }, index) => (
            <li
              key={id}
              data-drop={drop === id || undefined}
              onDragOver={(event) => {
                if (!drag || drag === id) return;
                event.preventDefault();
                event.dataTransfer.dropEffect = "move";
                setDrop(id);
              }}
              onDrop={(event) => {
                if (!drag) return;
                event.preventDefault();
                move(
                  items.findIndex((item) => item.id === drag),
                  index,
                );
                setDrag(undefined);
                setDrop(undefined);
              }}
            >
              <span
                className={styles.grip}
                draggable={!busy}
                aria-hidden="true"
                onDragStart={(event) => {
                  event.dataTransfer.setData("text/plain", id);
                  event.dataTransfer.effectAllowed = "move";
                  setDrag(id);
                }}
                onDragEnd={() => {
                  setDrag(undefined);
                  setDrop(undefined);
                }}
              >
                <GripVertical size={16} />
              </span>
              <span className={styles.position} aria-hidden="true">
                {index + 1}
              </span>
              <span className={styles.title}>{title}</span>
              <div className={styles.moves}>
                <IconButton
                  aria-label={t("up", { title })}
                  title={t("up", { title })}
                  disabled={busy || index === 0}
                  onClick={() => move(index, index - 1)}
                >
                  <ArrowUp size={16} aria-hidden="true" />
                </IconButton>
                <IconButton
                  aria-label={t("down", { title })}
                  title={t("down", { title })}
                  disabled={busy || index === items.length - 1}
                  onClick={() => move(index, index + 1)}
                >
                  <ArrowDown size={16} aria-hidden="true" />
                </IconButton>
              </div>
            </li>
          ))}
        </ol>
      )}
      <div className={styles.footer}>
        <Button variant="quiet" disabled={busy} onClick={close}>
          {t("cancel")}
        </Button>
        <Button
          variant="primary"
          busy={busy}
          disabled={!dirty || error === "conflict"}
          onClick={() => void save()}
        >
          {t("save")}
        </Button>
      </div>
    </Dialog>
  );
}
