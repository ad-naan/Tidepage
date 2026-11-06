"use client";
import { useRef, useState } from "react";
import type { Editor } from "@tiptap/core";
import { RichTextEditor } from "@/modules/content/ui/admin/editor/RichTextEditor";
import { parsePageDocument, parsePageSections } from "../domain/pages";
import { imageUploader } from "@/modules/media/ui/admin/media-client";
import { RichText } from "@/modules/content/ui/rich-text/RichText";
import { Button } from "@/shared/ui/button/Button";
import { useTranslations } from "next-intl";

export function PageDocumentEditor({
  label,
  value,
  legacy,
  onChange,
  onUploading,
}: {
  label: string;
  value?: string;
  legacy?: string;
  onChange: (value: string) => void;
  onUploading: (busy: boolean) => void;
}) {
  const editor = useRef<Editor | null>(null);
  const [preview, setPreview] = useState(false);
  const t = useTranslations("admin.editor");
  return (
    <section aria-label={label}>
      <h2>{label}</h2>
      <Button
        aria-pressed={preview}
        onClick={() => setPreview((value) => !value)}
      >
        {t("preview")}
      </Button>
      <div hidden={preview}>
        <RichTextEditor
          initial={parsePageDocument(value, parsePageSections(legacy))}
          uploader={imageUploader}
          onUploading={onUploading}
          onReady={(instance) => {
            editor.current = instance;
          }}
          onDirty={() => {
            if (editor.current)
              onChange(JSON.stringify(editor.current.getJSON()));
          }}
        />
      </div>
      {preview && (
        <RichText
          document={parsePageDocument(value, parsePageSections(legacy))}
        />
      )}
    </section>
  );
}
