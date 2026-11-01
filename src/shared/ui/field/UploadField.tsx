"use client";
import { useRef } from "react";
import { useTranslations } from "next-intl";
import { Upload } from "lucide-react";
import { Button } from "@/shared/ui/button/Button";
import { FileInput } from "./Input";
import styles from "./UploadField.module.css";
export function UploadField({
  id,
  label,
  accept,
  multiple = false,
  disabled = false,
  onFiles,
  "aria-describedby": describedBy,
  "aria-invalid": invalid,
}: {
  id?: string;
  label: string;
  accept?: string;
  multiple?: boolean;
  disabled?: boolean;
  onFiles: (files: File[]) => void;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean | "true" | "false" | "grammar" | "spelling";
}) {
  const input = useRef<HTMLInputElement>(null);
  const t = useTranslations("ui.upload");
  return (
    <div className={styles.root}>
      <FileInput
        ref={input}
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        tabIndex={-1}
        className={styles.native}
        aria-hidden="true"
        onChange={(event) => {
          const files = Array.from(event.target.files ?? []);
          event.target.value = "";
          if (files.length) onFiles(files);
        }}
      />
      <Button
        id={id}
        variant="quiet"
        disabled={disabled}
        aria-label={label}
        aria-describedby={describedBy}
        aria-invalid={invalid}
        onClick={() => input.current?.click()}
      >
        <Upload size={15} aria-hidden="true" />
        {t("choose")}
      </Button>
    </div>
  );
}
