"use client";

import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown, ChevronUp, LoaderCircle } from "lucide-react";
import { useRef, useState, type ReactNode } from "react";
import { useOverlayOwner } from "@/shared/ui/overlay/OverlayScope";
import styles from "./Select.module.css";

export type SelectOption<Value extends string> = {
  value: Value;
  label: string;
  description?: string;
  lang?: string;
  disabled?: boolean;
};

type SelectProps<Value extends string> = {
  value: Value;
  options: readonly SelectOption<Value>[];
  onValueChange: (value: Value) => void;
  focusAfterSelection?: () => void;
  label: string;
  id?: string;
  name?: string;
  placeholder?: string;
  icon?: ReactNode;
  disabled?: boolean;
  busy?: boolean;
  required?: boolean;
  invalid?: boolean;
  describedBy?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean | "true" | "false" | "grammar" | "spelling";
  dir?: "ltr" | "rtl";
  variant?: "surface" | "ghost";
  className?: string;
};

/** Shared select behavior: focus, typeahead, keyboard navigation and portal placement. */
export function Select<Value extends string>({
  value,
  options,
  onValueChange,
  focusAfterSelection,
  label,
  id,
  name,
  placeholder,
  icon,
  disabled = false,
  busy = false,
  required = false,
  invalid = false,
  describedBy,
  "aria-describedby": nativeDescription,
  "aria-invalid": nativeInvalid,
  dir = "ltr",
  variant = "surface",
  className = "",
}: SelectProps<Value>) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const selectedInMenu = useRef(false);
  const [portalContainer, setPortalContainer] = useState<
    HTMLElement | undefined
  >();
  const owner = useOverlayOwner();
  return (
    <SelectPrimitive.Root
      open={open}
      onOpenChange={(next) => {
        if (next) selectedInMenu.current = false;
        setPortalContainer(
          trigger.current?.closest<HTMLElement>("dialog[open]") ??
            (document.fullscreenElement instanceof HTMLElement
              ? document.fullscreenElement
              : undefined),
        );
        setOpen(next);
      }}
      value={value}
      onValueChange={(next) => {
        const option = options.find(
          (item) => item.value === next && !item.disabled,
        );
        if (option) {
          selectedInMenu.current = open;
          onValueChange(option.value);
        }
      }}
      name={name}
      disabled={disabled || busy}
      required={required}
      dir={dir}
    >
      <SelectPrimitive.Trigger
        data-focus={variant === "ghost" ? "control" : "field"}
        ref={trigger}
        id={id}
        aria-label={label}
        aria-busy={busy}
        aria-invalid={nativeInvalid ?? (invalid || undefined)}
        aria-describedby={nativeDescription ?? describedBy}
        title={label}
        className={`${styles.trigger} ${styles[variant]} ${className}`}
      >
        {icon && (
          <span className={styles.leading} aria-hidden="true">
            {icon}
          </span>
        )}
        <span className={styles.value} data-select-part="value">
          <SelectPrimitive.Value placeholder={placeholder} />
        </span>
        <SelectPrimitive.Icon className={styles.chevron}>
          {busy ? (
            <LoaderCircle size={13} className={styles.spinner} />
          ) : (
            <ChevronDown size={12} />
          )}
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal container={portalContainer}>
        <SelectPrimitive.Content
          className={styles.content}
          position="popper"
          align="end"
          sideOffset={9}
          collisionPadding={12}
          avoidCollisions
          onCloseAutoFocus={(event) => {
            if (selectedInMenu.current && focusAfterSelection) {
              event.preventDefault();
              focusAfterSelection();
            }
          }}
          data-ui-overlay-owner={owner}
        >
          <SelectPrimitive.ScrollUpButton className={styles.scrollButton}>
            <ChevronUp size={14} />
          </SelectPrimitive.ScrollUpButton>
          <SelectPrimitive.Viewport className={styles.viewport}>
            {options.map((option) => (
              <SelectPrimitive.Item
                key={option.value}
                value={option.value}
                disabled={option.disabled}
                textValue={option.label}
                lang={option.lang}
                aria-selected={option.value === value}
                className={styles.item}
              >
                <span className={styles.optionCopy}>
                  <SelectPrimitive.ItemText>
                    {option.label}
                  </SelectPrimitive.ItemText>
                  {option.description && (
                    <span className={styles.description}>
                      {option.description}
                    </span>
                  )}
                </span>
                <SelectPrimitive.ItemIndicator className={styles.indicator}>
                  <Check size={14} />
                </SelectPrimitive.ItemIndicator>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
          <SelectPrimitive.ScrollDownButton className={styles.scrollButton}>
            <ChevronDown size={14} />
          </SelectPrimitive.ScrollDownButton>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}
