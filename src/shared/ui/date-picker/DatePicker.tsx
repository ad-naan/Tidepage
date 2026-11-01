"use client";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { Button, IconButton } from "@/shared/ui/button/Button";
import { Select } from "@/shared/ui/select/Select";
import { Dialog } from "@/shared/ui/dialog/Dialog";
import { dateParts, dayKey, shiftDay, monthDays } from "./calendar";
import styles from "./DatePicker.module.css";
export function DatePicker({
  id,
  value,
  onValueChange,
  label,
  withTime = false,
  disabled = false,
  required = false,
  "aria-describedby": describedBy,
  "aria-invalid": invalid,
}: {
  id?: string;
  value: string;
  onValueChange: (value: string) => void;
  label: string;
  withTime?: boolean;
  disabled?: boolean;
  required?: boolean;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean | "true" | "false" | "grammar" | "spelling";
}) {
  const locale = useLocale();
  const t = useTranslations("ui.datePicker");
  const [open, setOpen] = useState(false);
  const initial = dateParts(value);
  const today = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const [selected, setSelected] = useState(value.slice(0, 10) || today);
  const [view, setView] = useState({
    year: initial?.year ?? 2026,
    month: initial?.month ?? 0,
  });
  const [hour, setHour] = useState(initial?.hour ?? "12");
  const [minute, setMinute] = useState(initial?.minute ?? "00");
  const [focusDate, setFocusDate] = useState(selected);
  const grid = useRef<HTMLDivElement>(null);
  const focusPending = useRef(false);
  useEffect(() => {
    if (open && focusPending.current) {
      focusPending.current = false;
      grid.current
        ?.querySelector<HTMLButtonElement>(`[data-day="${focusDate}"]`)
        ?.focus();
    }
  }, [view, focusDate, open]);
  function show() {
    const parts = dateParts(value) || dateParts(today)!;
    const key = dayKey(parts.year, parts.month, parts.day);
    setView({ year: parts.year, month: parts.month });
    setSelected(key);
    setFocusDate(key);
    setHour(parts.hour);
    setMinute(parts.minute);
    setOpen(true);
  }
  function moveMonth(offset: number) {
    const date = new Date(Date.UTC(view.year, view.month + offset, 1));
    setView({ year: date.getUTCFullYear(), month: date.getUTCMonth() });
    setFocusDate(dayKey(date.getUTCFullYear(), date.getUTCMonth(), 1));
  }
  function keyboard(event: KeyboardEvent<HTMLButtonElement>, day: string) {
    const delta = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[
      event.key
    ];
    if (delta !== undefined) {
      event.preventDefault();
      const next = shiftDay(day, delta);
      const parts = dateParts(next)!;
      setFocusDate(next);
      setView({ year: parts.year, month: parts.month });
      focusPending.current = true;
    } else if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      const date = new Date(`${day}T00:00:00Z`);
      const index = (date.getUTCDay() + 6) % 7;
      const next = shiftDay(day, event.key === "Home" ? -index : 6 - index);
      const parts = dateParts(next)!;
      setFocusDate(next);
      setView({ year: parts.year, month: parts.month });
      focusPending.current = true;
    } else if (event.key === "PageUp" || event.key === "PageDown") {
      event.preventDefault();
      focusPending.current = true;
      moveMonth(event.key === "PageUp" ? -1 : 1);
    }
  }
  const format = new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
  const parsed = dateParts(value);
  const display = parsed
    ? `${format.format(new Date(Date.UTC(parsed.year, parsed.month, parsed.day)))}${withTime ? ` ${parsed.hour}:${parsed.minute}` : ""}`
    : t("placeholder");
  const cells: (string | null)[] = Array(
    (new Date(Date.UTC(view.year, view.month, 1)).getUTCDay() + 6) % 7,
  ).fill(null);
  for (let day = 1; day <= monthDays(view.year, view.month); day++)
    cells.push(dayKey(view.year, view.month, day));
  while (cells.length % 7) cells.push(null);
  return (
    <>
      <Button
        id={id}
        className={styles.trigger}
        variant="quiet"
        aria-label={label}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-describedby={describedBy}
        aria-invalid={invalid}
        aria-required={required}
        disabled={disabled}
        onClick={show}
      >
        <CalendarDays size={15} aria-hidden="true" />
        <span>{display}</span>
      </Button>
      {open && (
        <Dialog title={label} onClose={() => setOpen(false)}>
          <div className={styles.calendar}>
            <header className={styles.month}>
              <IconButton
                aria-label={t("previous")}
                onClick={() => moveMonth(-1)}
              >
                <ChevronLeft size={16} />
              </IconButton>
              <strong aria-live="polite">
                {new Intl.DateTimeFormat(locale, {
                  year: "numeric",
                  month: "long",
                  timeZone: "UTC",
                }).format(new Date(Date.UTC(view.year, view.month, 1)))}
              </strong>
              <IconButton aria-label={t("next")} onClick={() => moveMonth(1)}>
                <ChevronRight size={16} />
              </IconButton>
            </header>
            <div
              role="grid"
              aria-label={t("calendar")}
              ref={grid}
              className={styles.grid}
            >
              <div role="row" className={styles.week}>
                {Array.from({ length: 7 }, (_, i) => (
                  <span role="columnheader" key={i}>
                    {new Intl.DateTimeFormat(locale, {
                      weekday: "short",
                      timeZone: "UTC",
                    }).format(new Date(Date.UTC(2024, 0, 1 + i)))}
                  </span>
                ))}
              </div>
              {Array.from({ length: cells.length / 7 }, (_, row) => (
                <div role="row" className={styles.week} key={row}>
                  {cells.slice(row * 7, row * 7 + 7).map((day, col) => (
                    <div
                      role="gridcell"
                      aria-selected={day === selected}
                      key={col}
                    >
                      {day && (
                        <Button
                          data-day={day}
                          aria-label={format.format(
                            new Date(`${day}T00:00:00Z`),
                          )}
                          aria-pressed={day === selected}
                          className={styles.day}
                          tabIndex={day === focusDate ? 0 : -1}
                          onKeyDown={(e) => keyboard(e, day)}
                          onClick={() => {
                            setSelected(day);
                            setFocusDate(day);
                          }}
                        >
                          {Number(day.slice(-2))}
                          <span
                            className={day === today ? styles.today : undefined}
                          />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
            {withTime && (
              <div className={styles.time}>
                <Select
                  label={t("hour")}
                  value={hour}
                  options={Array.from({ length: 24 }, (_, i) => ({
                    value: String(i).padStart(2, "0"),
                    label: String(i).padStart(2, "0"),
                  }))}
                  onValueChange={setHour}
                />
                <span>:</span>
                <Select
                  label={t("minute")}
                  value={minute}
                  options={Array.from({ length: 60 }, (_, i) => ({
                    value: String(i).padStart(2, "0"),
                    label: String(i).padStart(2, "0"),
                  }))}
                  onValueChange={setMinute}
                />
                <small>{t("timezone")}</small>
              </div>
            )}
            <footer className={styles.actions}>
              <Button
                size="sm"
                onClick={() => {
                  const parts = dateParts(today)!;
                  setView({ year: parts.year, month: parts.month });
                  setSelected(today);
                  setFocusDate(today);
                }}
              >
                {t("today")}
              </Button>
              {!required && (
                <Button
                  size="sm"
                  onClick={() => {
                    onValueChange("");
                    setOpen(false);
                  }}
                >
                  {t("clear")}
                </Button>
              )}
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  onValueChange(
                    `${selected}${withTime ? `T${hour}:${minute}` : ""}`,
                  );
                  setOpen(false);
                }}
              >
                {t("apply")}
              </Button>
            </footer>
          </div>
        </Dialog>
      )}
    </>
  );
}
