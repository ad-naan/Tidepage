"use client";

import { useId, type ReactNode } from "react";
import { CircleAlert, CircleCheck } from "lucide-react";
import { Button } from "@/shared/ui/button/Button";
import { Dialog } from "./Dialog";
import styles from "./ConfirmDialog.module.css";

export function ConfirmDialog({
  title,
  description,
  cancelLabel,
  confirmLabel,
  onClose,
  onConfirm,
  children,
  danger = false,
  busy = false,
  disabled = false,
}: {
  title: string;
  description: ReactNode;
  cancelLabel: string;
  confirmLabel: string;
  onClose: () => void;
  onConfirm: () => void;
  children?: ReactNode;
  danger?: boolean;
  busy?: boolean;
  disabled?: boolean;
}) {
  const id = useId();
  const Icon = danger ? CircleAlert : CircleCheck;
  return (
    <Dialog
      title={title}
      surface="confirmation"
      dismissible={!busy}
      onClose={onClose}
      descriptionId={id}
      headingIcon={
        <span className={styles.mark} data-danger={danger}>
          <Icon size={20} strokeWidth={1.6} aria-hidden="true" />
        </span>
      }
    >
      <div className={styles.description} id={id}>
        {description}
      </div>
      {children}
      <div className={styles.actions} data-danger={danger}>
        <Button
          variant="quiet"
          data-dialog-initial-focus
          disabled={busy}
          onClick={onClose}
        >
          {cancelLabel}
        </Button>
        <Button
          variant="primary"
          busy={busy}
          disabled={disabled}
          onClick={onConfirm}
        >
          {confirmLabel}
        </Button>
      </div>
    </Dialog>
  );
}
