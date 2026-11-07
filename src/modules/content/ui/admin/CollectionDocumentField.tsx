"use client";
import { useRef } from "react";
import type { Editor } from "@tiptap/core";
import {
  editorDocumentSchema,
  type EditorNode,
} from "@/shared/contracts/rich-text";
import { imageUploader } from "@/modules/media/ui/admin/media-client";
import { RichTextEditor } from "./editor/RichTextEditor";

export default function CollectionDocumentField({
  label,
  value,
  onChange,
  onUploading,
}: {
  label: string;
  value: EditorNode;
  onChange: (body: EditorNode) => void;
  onUploading: (busy: boolean) => void;
}) {
  const editor = useRef<Editor | null>(null);
  return (
    <section aria-label={label}>
      <h3>{label}</h3>
      <RichTextEditor
        initial={value}
        uploader={imageUploader}
        onUploading={onUploading}
        onReady={(instance) => {
          editor.current = instance;
        }}
        onDirty={() => {
          const body = editorDocumentSchema.safeParse(
            editor.current?.getJSON(),
          );
          if (body.success) onChange(body.data);
        }}
      />
    </section>
  );
}
