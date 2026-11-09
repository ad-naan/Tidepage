"use client";
import { useEffect, useState } from "react";
import { useEditor, EditorContent, useEditorState } from "@tiptap/react";
import type { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  Highlighter,
  Quote,
  List,
  Link2,
  Code2,
} from "lucide-react";
import { useMessages, useTranslations } from "next-intl";
import { StickerNode } from "./StickerNode";
import { StickerPicker } from "./StickerPicker";
import { IconButton, Button } from "@/shared/ui/button/Button";
import { Dialog } from "@/shared/ui/dialog/Dialog";
import { Field } from "@/shared/ui/field/Field";
import { Input } from "@/shared/ui/field/Input";
import { LoadingSkeleton } from "@/shared/ui/loading/LoadingSkeleton";
import {
  safeWebUrl,
  type EditorNode,
} from "@/modules/content/domain/editor-document";
import {
  FontSizeMark,
  HighlightMark,
  SuperscriptMark,
  SubscriptMark,
} from "./RichTextMarks";
import styles from "./RichTextComposer.module.css";

export function RichTextComposer({
  id,
  label,
  placeholder,
  initial,
  disabled,
  onChange,
  onReady,
}: {
  id: string;
  label: string;
  placeholder: string;
  initial: EditorNode;
  disabled?: boolean;
  onChange: (value: EditorNode) => void;
  onReady: (editor: Editor | null) => void;
}) {
  const t = useTranslations("admin.editor");
  const stickerLabels = useMessages().stickers.items as Record<string, string>;
  const [link, setLink] = useState<string | null>(null);
  const [invalid, setInvalid] = useState(false);
  const editor = useEditor({
    immediatelyRender: false,
    shouldRerenderOnTransaction: false,
    content: initial,
    extensions: [
      StarterKit.configure({
        heading: false,
        link: {
          openOnClick: false,
          isAllowedUri: (url) => safeWebUrl.safeParse(url).success,
        },
      }),
      Placeholder.configure({ placeholder }),
      FontSizeMark,
      HighlightMark,
      SuperscriptMark,
      SubscriptMark,
      StickerNode.configure({ labels: stickerLabels }),
    ],
    editorProps: {
      attributes: {
        id,
        role: "textbox",
        "aria-label": label,
        "aria-multiline": "true",
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getJSON()),
  });
  useEffect(() => {
    onReady(editor);
    return () => onReady(null);
  }, [editor]);
  useEffect(() => {
    editor?.setEditable(!disabled);
  }, [editor, disabled]);
  const state = useEditorState({
    editor,
    selector: ({ editor }) =>
      editor
        ? Object.fromEntries(
            [
              "bold",
              "italic",
              "strike",
              "code",
              "highlight",
              "blockquote",
              "bulletList",
              "codeBlock",
              "link",
            ].map((name) => [name, editor.isActive(name)]),
          )
        : {},
  });
  if (!editor) return <LoadingSkeleton variant="rows" />;
  return (
    <div className={styles.composer} aria-disabled={disabled}>
      <div className={styles.tools} role="toolbar" aria-label={t("toolbar")}>
        <StickerPicker
          disabled={disabled || state?.codeBlock}
          onSelect={(id) =>
            editor
              .chain()
              .focus()
              .insertContent({ type: "sticker", attrs: { id } })
              .run()
          }
        />
        {(
          [
            ["bold", Bold],
            ["italic", Italic],
            ["strike", Strikethrough],
            ["code", Code],
            ["highlight", Highlighter],
          ] as const
        ).map(([key, Icon]) => (
          <IconButton
            key={key}
            aria-label={t(`format.${key}`)}
            title={t(`format.${key}`)}
            aria-pressed={state?.[key]}
            disabled={disabled}
            onPointerDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().toggleMark(key).run()}
          >
            <Icon size={14} />
          </IconButton>
        ))}
        <IconButton
          aria-label={t("inlineLink")}
          title={t("inlineLink")}
          aria-pressed={state?.link}
          disabled={disabled}
          onClick={() => {
            setLink(String(editor.getAttributes("link").href || ""));
            setInvalid(false);
          }}
        >
          <Link2 size={14} />
        </IconButton>
        <IconButton
          aria-label={t("blocks.quote")}
          title={t("blocks.quote")}
          aria-pressed={state?.blockquote}
          disabled={disabled}
          onPointerDown={(e) => e.preventDefault()}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
          <Quote size={14} />
        </IconButton>
        <IconButton
          aria-label={t("blocks.bullet")}
          title={t("blocks.bullet")}
          aria-pressed={state?.bulletList}
          disabled={disabled}
          onPointerDown={(e) => e.preventDefault()}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List size={14} />
        </IconButton>
        <IconButton
          aria-label={t("blocks.code")}
          title={t("blocks.code")}
          aria-pressed={state?.codeBlock}
          disabled={disabled}
          onPointerDown={(e) => e.preventDefault()}
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        >
          <Code2 size={14} />
        </IconButton>
      </div>
      <EditorContent editor={editor} className={styles.document} />
      {link !== null && (
        <Dialog title={t("inlineLink")} onClose={() => setLink(null)}>
          <Field
            id={`${id}-link`}
            label={t("referenceUrl")}
            error={invalid ? t("referenceError") : undefined}
          >
            <Input value={link} onChange={(e) => setLink(e.target.value)} />
          </Field>
          <Button
            variant="primary"
            onClick={() => {
              const href = link.trim();
              if (!href)
                editor
                  .chain()
                  .focus()
                  .extendMarkRange("link")
                  .unsetLink()
                  .run();
              else if (safeWebUrl.safeParse(href).success)
                editor
                  .chain()
                  .focus()
                  .extendMarkRange("link")
                  .setLink({ href })
                  .run();
              else {
                setInvalid(true);
                return;
              }
              setLink(null);
            }}
          >
            {t("insert")}
          </Button>
        </Dialog>
      )}
    </div>
  );
}
