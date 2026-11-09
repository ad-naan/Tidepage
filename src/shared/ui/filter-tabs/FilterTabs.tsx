"use client";
import { Button } from "@/shared/ui/button/Button";
import { useRef, type KeyboardEvent } from "react";
import { HanddrawnMark } from "@/shared/ui/drawing/HanddrawnMark";
import styles from "./FilterTabs.module.css";

type Option<Value extends string> = {
  value: Value;
  label: string;
  count?: number;
  lang?: string;
};
/** Filters are pressed buttons, not ARIA tabs without matching tabpanels. */
export function FilterTabs<Value extends string>({
  value,
  options,
  onChange,
  label,
  className = "",
  busy = false,
  variant = "filter",
}: {
  value: Value;
  options: readonly Option<Value>[];
  onChange: (value: Value) => void;
  label: string;
  className?: string;
  busy?: boolean;
  variant?: "filter" | "inline";
}) {
  const group = useRef<HTMLDivElement>(null);
  function keyboard(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next = index;
    if (event.key === "ArrowRight") next = (index + 1) % options.length;
    else if (event.key === "ArrowLeft")
      next = (index - 1 + options.length) % options.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = options.length - 1;
    else return;
    event.preventDefault();
    group.current?.querySelectorAll("button")[next]?.focus();
  }
  return (
    <div
      ref={group}
      className={`${styles.tabs} ${className}`}
      data-variant={variant}
      role="group"
      aria-label={label}
      aria-busy={busy}
    >
      {options.map((option, index) => (
        <Button
          type="button"
          key={option.value}
          className={styles.tab}
          lang={option.lang}
          aria-pressed={value === option.value}
          onKeyDown={(event) => keyboard(event, index)}
          onClick={() => {
            if (!busy && value !== option.value) onChange(option.value);
          }}
        >
          <svg
            className={styles.wash}
            viewBox="0 0 100 32"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <path d="m4 10 18-5 30 2 33-2 11 6-3 14-29 2-28-2-29 2-5-9Z" />
          </svg>
          <span>{option.label}</span>
          {option.count !== undefined && <small>{option.count}</small>}
          <HanddrawnMark className={styles.mark} />
        </Button>
      ))}
    </div>
  );
}
