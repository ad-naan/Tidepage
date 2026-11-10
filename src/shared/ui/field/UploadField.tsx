"use client";
import { useId, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ClipboardPaste, Upload } from "lucide-react";
import { Button } from "@/shared/ui/button/Button";
import { FileInput } from "./Input";
import styles from "./UploadField.module.css";
export function UploadField({
  id,
  label,
  accept,
  multiple = false,
  pasteImages = false,
  disabled = false,
  onFiles,
  "aria-describedby": describedBy,
  "aria-invalid": invalid,
}: {
  id?: string;
  label: string;
  accept?: string;
  multiple?: boolean;
  pasteImages?: boolean;
  disabled?: boolean;
  onFiles: (files: File[]) => void;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean | "true" | "false" | "grammar" | "spelling";
}) {
  const input = useRef<HTMLInputElement>(null);
  const pasteButton = useRef<HTMLButtonElement>(null);
  const reading = useRef(false);
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<"empty" | "unavailable" | null>(
    null,
  );
  const hintId = useId();
  const t = useTranslations("ui.upload");
  const description =
    [describedBy, pasteImages && hintId].filter(Boolean).join(" ") || undefined;

  function submit(files: File[]) {
    setFeedback(null);
    onFiles(multiple ? files : files.slice(0, 1));
  }

  async function readClipboard() {
    if (reading.current || disabled) return;
    reading.current = true;
    setPending(true);
    setFeedback(null);
    try {
      const items = await navigator.clipboard.read();
      const images = items.flatMap((item) => {
        const type = item.types.find((type) => type.startsWith("image/"));
        return type ? [{ item, type }] : [];
      });
      const files = await Promise.all(
        (multiple ? images : images.slice(0, 1)).map(
          async ({ item, type }, index) =>
            new File(
              [await item.getType(type)],
              `clipboard-${index + 1}.${type.split("/")[1]}`,
              { type },
            ),
        ),
      );
      if (!pasteButton.current) return;
      if (files.length) submit(files);
      else setFeedback("empty");
    } catch {
      setFeedback("unavailable");
    } finally {
      reading.current = false;
      setPending(false);
    }
  }

  return (
    <div
      className={styles.root}
      onPaste={
        pasteImages
          ? (event) => {
              const files = Array.from(event.clipboardData.files).filter(
                (file) => file.type.startsWith("image/"),
              );
              if (!files.length) return;
              event.preventDefault();
              if (!disabled && !reading.current) submit(files);
            }
          : undefined
      }
    >
      <FileInput
        ref={input}
        accept={accept}
        multiple={multiple}
        disabled={disabled || pending}
        tabIndex={-1}
        className={styles.native}
        aria-hidden="true"
        onChange={(event) => {
          const files = Array.from(event.target.files ?? []);
          event.target.value = "";
          if (files.length) submit(files);
        }}
      />
      <Button
        id={id}
        variant="quiet"
        disabled={disabled || pending}
        aria-label={label}
        aria-describedby={description}
        aria-invalid={invalid}
        onClick={() => input.current?.click()}
      >
        <Upload size={15} aria-hidden="true" />
        {t("choose")}
      </Button>
      {pasteImages && (
        <>
          <Button
            ref={pasteButton}
            variant="quiet"
            disabled={disabled}
            aria-disabled={pending || undefined}
            aria-describedby={description}
            onClick={() => void readClipboard()}
          >
            <ClipboardPaste size={15} aria-hidden="true" />
            {t("paste")}
          </Button>
          <small id={hintId} className={styles.hint}>
            {t("pasteHint")}
          </small>
          <span role="status" className={styles.feedback}>
            {feedback && t(feedback)}
          </span>
        </>
      )}
    </div>
  );
}
