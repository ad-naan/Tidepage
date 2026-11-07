"use client";
import { LoadingSkeleton } from "@/shared/ui/loading/LoadingSkeleton";
import { useEffect, useId, useRef, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import { Extension, type Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import { TableKit } from "@tiptap/extension-table";
import Typography from "@tiptap/extension-typography";
import { useMessages, useTranslations } from "next-intl";
import { StickerNode } from "../../rich-text/StickerNode";
import { Bold, Italic, Link2, Maximize, Minimize } from "lucide-react";
import { Button, IconButton } from "@/shared/ui/button/Button";
import { Dialog } from "@/shared/ui/dialog/Dialog";
import { Input } from "@/shared/ui/field/Input";
import { useNotice, NoticeDock } from "@/shared/ui/feedback/NoticeProvider";
import { MediaPicker } from "@/modules/media/ui/admin/MediaPicker";
import type { ImageUploader } from "@/modules/media/domain/assets";
import { EditorToolbar } from "./EditorToolbar";
import { blockCommands, type BlockCommand } from "./block-commands";
import {
  safeWebUrl,
  type EditorNode,
  type Embed,
} from "@/modules/content/domain/editor-document";
import { ReferenceCard, AssetImageNode, CalloutNode } from "./ReferenceNode";
import { ReferenceDialog } from "./ReferenceDialog";
import { editCurrentBlock } from "./document-blocks";
import styles from "./editor.module.css";
import {
  HighlightMark,
  SuperscriptMark,
  SubscriptMark,
  DetailsNode,
} from "./ReadingExtensions";

export function RichTextEditor({
  initial,
  onReady,
  onDirty,
  onUploading,
  uploader,
  readOnly = false,
  active = true,
}: {
  initial: EditorNode;
  onReady?: (editor: Editor | null) => void;
  onDirty?: () => void;
  onUploading?: (busy: boolean) => void;
  readOnly?: boolean;
  active?: boolean;
  uploader?: ImageUploader;
}) {
  const t = useTranslations("admin.editor");
  const stickerLabels = useMessages().stickers.items as Record<string, string>;
  const { notify } = useNotice();
  const [imageOpen, setImageOpen] = useState(false);
  const [reference, setReference] = useState<{
    value: Embed;
    pos?: number;
  } | null>(null);
  const [link, setLink] = useState<string | null>(null);
  const [linkError, setLinkError] = useState(false);
  const [slash, setSlash] = useState<string | null>(null);
  const [help, setHelp] = useState(false);
  const slashId = useId();
  const slashList = useRef<HTMLDivElement>(null);
  const slashRange = useRef<{ from: number; to: number } | null>(null);
  const dismissed = useRef<number | null>(null);
  const syncSlash = useRef<(e: Editor) => void>(() => {});
  const linkAction = useRef<() => void>(() => {});
  const [slashIndex, setSlashIndex] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const scrollHost = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [fullscreenAvailable, setFullscreenAvailable] = useState(false);
  useEffect(() => {
    setFullscreenAvailable(!!document.fullscreenEnabled);
    const changed = () =>
      setFullscreen(document.fullscreenElement === root.current);
    document.addEventListener("fullscreenchange", changed);
    return () => document.removeEventListener("fullscreenchange", changed);
  }, []);
  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement === root.current)
        await document.exitFullscreen();
      else await root.current?.requestFullscreen();
    } catch {
      notify({ title: t("fullscreenUnavailable"), tone: "error" });
    }
  }
  const [slashPosition, setSlashPosition] = useState({ left: 0, top: 0 });
  const editorRef = useRef<Editor | null>(null);
  const uploads = useRef(new Set<AbortController>());
  const dirtyCallback = useRef(onDirty);
  dirtyCallback.current = onDirty;
  const uploadCallback = useRef(onUploading);
  uploadCallback.current = onUploading;
  const slashRef = useRef<string | null>(null);
  slashRef.current = slash;
  const actionRef = useRef<(key: BlockCommand) => void>(() => {});
  const filtered = blockCommands.filter((item) =>
    `${t(`blocks.${item.key}`)} ${item.keywords}`
      .toLocaleLowerCase()
      .includes((slash ?? "").toLocaleLowerCase()),
  );
  const filteredRef = useRef(filtered);
  filteredRef.current = filtered;
  const slashIndexRef = useRef(0);
  slashIndexRef.current = slashIndex;
  async function insertFiles(files: File[], position?: number) {
    const e = editorRef.current;
    if (!e || readOnly) return;
    if (!uploader) {
      notify({ title: t("uploadFailed"), tone: "error" });
      return;
    }
    for (const file of files) {
      const task = new AbortController();
      uploads.current.add(task);
      uploadCallback.current?.(true);
      const key = crypto.randomUUID();
      e.chain()
        .focus()
        .insertContentAt(position ?? e.state.selection.from, {
          type: "assetImage",
          attrs: {
            assetId: "",
            alt: file.name,
            uploading: true,
            uploadKey: key,
            width: 100,
          },
        })
        .run();
      try {
        const asset = await uploader.upload(file, {
          signal: task.signal,
          onProgress: () => {},
        });
        if (e.isDestroyed || task.signal.aborted) continue;
        let pos: number | undefined;
        e.state.doc.descendants((node, p) => {
          if (node.attrs.uploadKey === key) pos = p;
        });
        if (pos !== undefined)
          e.chain()
            .setNodeSelection(pos)
            .updateAttributes("assetImage", {
              assetId: asset.id,
              width: Math.min(
                100,
                Math.max(
                  20,
                  Math.round((asset.width / e.view.dom.clientWidth) * 100),
                ),
              ),
              uploading: false,
              uploadKey: null,
            })
            .run();
      } catch {
        if (!e.isDestroyed && !task.signal.aborted) {
          let found: { pos: number; size: number } | undefined;
          e.state.doc.descendants((node, p) => {
            if (node.attrs.uploadKey === key)
              found = { pos: p, size: node.nodeSize };
          });
          if (found)
            e.commands.deleteRange({
              from: found.pos,
              to: found.pos + found.size,
            });
          notify({ title: t("uploadFailed"), tone: "error" });
        }
      } finally {
        uploads.current.delete(task);
        uploadCallback.current?.(uploads.current.size > 0);
      }
    }
  }
  const editor = useEditor({
    immediatelyRender: false,
    shouldRerenderOnTransaction: false,
    editable: !readOnly,
    content: initial,
    extensions: [
      StarterKit.configure({
        link: {
          openOnClick: false,
          isAllowedUri: (url) => safeWebUrl.safeParse(url).success,
        },
      }),
      Placeholder.configure({ placeholder: t("placeholder") }),
      TaskList,
      TaskItem.configure({ nested: true }),
      TableKit.configure({ table: { resizable: false } }),
      Typography,
      ReferenceCard.configure({
        onEdit: (value: Embed, pos: number) => setReference({ value, pos }),
      }),
      AssetImageNode,
      CalloutNode,
      HighlightMark,
      SuperscriptMark,
      SubscriptMark,
      DetailsNode,
      StickerNode.configure({ labels: stickerLabels }),
      Extension.create({
        name: "codeCaption",
        addGlobalAttributes() {
          return [
            { types: ["codeBlock"], attributes: { caption: { default: "" } } },
          ];
        },
      }),
    ],
    onUpdate: ({ editor: e }) => {
      dirtyCallback.current?.();
      syncSlash.current(e);
    },
    onSelectionUpdate: ({ editor: e }) => syncSlash.current(e),
    editorProps: {
      attributes: {
        "aria-label": t("bodyLabel"),
        role: "textbox",
        "aria-multiline": "true",
        spellcheck: "true",
      },
      handleKeyDown: (view, event) => {
        if (event.isComposing || view.composing) return false;
        if (
          view.editable &&
          event.altKey &&
          event.shiftKey &&
          (event.key === "ArrowUp" || event.key === "ArrowDown")
        ) {
          const transaction = editCurrentBlock(
            view.state,
            event.key === "ArrowUp" ? "up" : "down",
          );
          if (transaction) {
            view.dispatch(transaction);
            return true;
          }
        }
        if (
          (event.ctrlKey || event.metaKey) &&
          event.key.toLowerCase() === "k"
        ) {
          linkAction.current();
          return true;
        }
        if (slashRef.current !== null) {
          if (event.key === "Escape") {
            dismissed.current = slashRange.current?.from ?? null;
            setSlash(null);
            return true;
          }
          const count = filteredRef.current.length;
          if ((event.key === "ArrowDown" || event.key === "ArrowUp") && count) {
            setSlashIndex(
              (i) => (i + (event.key === "ArrowDown" ? 1 : count - 1)) % count,
            );
            return true;
          }
          if (event.key === "Enter" && count) {
            const option = filteredRef.current[slashIndexRef.current % count];
            if (option) actionRef.current(option.key);
            return true;
          }
        }
        return false;
      },
      handlePaste: (_view, event) => {
        const files = Array.from(event.clipboardData?.files ?? []);
        if (!files.length || readOnly) return false;
        void insertFiles(files);
        return true;
      },
      handleDrop: (view, event, moved) => {
        if (moved || readOnly) return false;
        const files = Array.from(event.dataTransfer?.files ?? []);
        if (!files.length) return false;
        const pos = view.posAtCoords({
          left: event.clientX,
          top: event.clientY,
        })?.pos;
        void insertFiles(files, pos);
        return true;
      },
    },
  });
  editorRef.current = editor;
  useEffect(() => {
    onReady?.(editor);
    return () => onReady?.(null);
  }, [editor, onReady]);
  useEffect(() => {
    editor?.setEditable(!readOnly && active, false);
  }, [editor, readOnly, active]);
  useEffect(
    () => () => {
      for (const task of uploads.current) task.abort();
    },
    [],
  );
  syncSlash.current = (e) => {
    const { $from, empty, from } = e.state.selection;
    const text = $from.parent.textBetween(0, $from.parentOffset, "\n");
    const match =
      empty &&
      $from.parent.type.name === "paragraph" &&
      /^\/([^\n/]{0,40})$/.exec(text);
    if (!match) {
      dismissed.current = null;
      slashRange.current = null;
      setSlash(null);
      return;
    }
    const start = from - text.length;
    if (dismissed.current === start) return;
    slashRange.current = { from: start, to: from };
    if (slashRef.current !== match[1]) setSlashIndex(0);
    setSlash(match[1]);
    const bounds = root.current?.getBoundingClientRect();
    if (!bounds) return;
    const caret = e.view.coordsAtPos(from);
    const bottom =
      scrollHost.current?.getBoundingClientRect().bottom ?? innerHeight;
    setSlashPosition({
      left: Math.max(0, Math.min(caret.left - bounds.left, bounds.width - 280)),
      top:
        caret.bottom + 310 > bottom
          ? Math.max(0, caret.top - bounds.top - 302)
          : caret.bottom - bounds.top + 8,
    });
  };
  linkAction.current = () => {
    if (!editor) return;
    setLink(String(editor.getAttributes("link").href ?? ""));
    setLinkError(false);
  };
  actionRef.current = (key) => {
    if (!editor) return;
    if (slashRange.current && slashRef.current !== null)
      editor.commands.deleteRange(slashRange.current);
    slashRange.current = null;
    setSlash(null);
    const chain = editor.chain().focus();
    if (key === "heading") chain.setHeading({ level: 2 }).run();
    else if (key === "subheading") chain.setHeading({ level: 3 }).run();
    else if (key === "bullet") chain.toggleBulletList().run();
    else if (key === "ordered") chain.toggleOrderedList().run();
    else if (key === "tasks") chain.toggleTaskList().run();
    else if (key === "quote") chain.toggleBlockquote().run();
    else if (key === "callout")
      chain
        .insertContent({ type: "callout", content: [{ type: "paragraph" }] })
        .run();
    else if (key === "details")
      chain
        .insertContent({
          type: "details",
          attrs: { summary: t("detailsTitle") },
          content: [{ type: "paragraph" }],
        })
        .run();
    else if (key === "code") chain.toggleCodeBlock().run();
    else if (key === "divider") chain.setHorizontalRule().run();
    else if (key === "table")
      chain.insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
    else if (key === "image") setImageOpen(true);
    else
      setReference({
        value: {
          kind: key,
          title: "",
          url: "",
          description: "",
          creator: "",
          year: "",
          artworkAssetId: "",
        },
      });
  };
  useEffect(() => {
    slashList.current
      ?.querySelector('[aria-selected="true"]')
      ?.scrollIntoView({ block: "nearest" });
  }, [slashIndex]);
  useEffect(() => {
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setSlash(null);
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, []);
  if (!editor) return <LoadingSkeleton variant="document" />;
  return (
    <div className={styles.root} ref={root} data-expanded={expanded}>
      {fullscreen && <NoticeDock />}
      {!readOnly && (
        <div className={styles.viewportTools}>
          <span>{t("bodyLabel")}</span>
          <div>
            <Button
              variant="quiet"
              size="sm"
              aria-pressed={expanded}
              disabled={fullscreen}
              onClick={() => setExpanded(!expanded)}
            >
              {t(expanded ? "normalHeight" : "expandHeight")}
            </Button>
            {fullscreenAvailable && (
              <Button
                variant="quiet"
                size="sm"
                aria-pressed={fullscreen}
                onClick={() => void toggleFullscreen()}
              >
                {fullscreen ? <Minimize size={14} /> : <Maximize size={14} />}
                {t(fullscreen ? "exitFullscreen" : "fullscreen")}
              </Button>
            )}
          </div>
        </div>
      )}
      {!readOnly && (
        <EditorToolbar
          editor={editor}
          onInsert={(key) => actionRef.current(key)}
          onLink={() => linkAction.current()}
          onHelp={() => setHelp(true)}
        />
      )}
      {slash !== null && active && (
        <div
          className={styles.slash}
          style={slashPosition}
          aria-label={t("slashMenu")}
        >
          <div className={styles.commandHeading}>
            {t("slashSearch")}
            <kbd>Esc</kbd>
          </div>
          <div
            ref={slashList}
            className={styles.commandList}
            id={slashId}
            role="listbox"
            aria-label={t("slashMenu")}
          >
            {filtered.length ? (
              filtered.map(({ key, icon: Icon }, i) => (
                <Button
                  key={key}
                  role="option"
                  aria-selected={slashIndex === i}
                  className={styles.command}
                  pressEffect={false}
                  onPointerDown={(e) => e.preventDefault()}
                  onClick={() => actionRef.current(key)}
                >
                  <Icon size={16} />
                  <span>{t(`blocks.${key}`)}</span>
                  {slashIndex === i && <kbd>Enter</kbd>}
                </Button>
              ))
            ) : (
              <p className={styles.noCommands}>{t("noCommands")}</p>
            )}
          </div>
          <div className={styles.commandFooter}>{t("slashKeys")}</div>
        </div>
      )}
      <div
        ref={scrollHost}
        className={styles.scrollHost}
        data-custom-scroll={t("bodyLabel")}
        onScroll={() => setSlash(null)}
      >
        <EditorContent editor={editor} className={styles.document} />
      </div>
      {!readOnly && active && (
        <BubbleMenu
          editor={editor}
          updateDelay={100}
          appendTo={() =>
            root.current?.closest<HTMLElement>("dialog[open]") ??
            (document.fullscreenElement instanceof HTMLElement
              ? document.fullscreenElement
              : null) ??
            document.body
          }
          className={styles.bubble}
          options={{
            placement: "top",
            offset: 8,
            scrollTarget: scrollHost.current ?? window,
          }}
          shouldShow={({ state }) =>
            editor.isEditable &&
            !state.selection.empty &&
            !editor.isActive("assetImage") &&
            !editor.isActive("referenceCard")
          }
        >
          <IconButton
            aria-label={t("format.bold")}
            onPointerDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().toggleBold().run()}
          >
            <Bold size={15} />
          </IconButton>
          <IconButton
            aria-label={t("format.italic")}
            onPointerDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().toggleItalic().run()}
          >
            <Italic size={15} />
          </IconButton>
          <IconButton
            aria-label={t("inlineLink")}
            onClick={() =>
              setLink(String(editor.getAttributes("link").href ?? ""))
            }
          >
            <Link2 size={15} />
          </IconButton>
        </BubbleMenu>
      )}
      {help && (
        <Dialog title={t("shortcuts")} onClose={() => setHelp(false)}>
          <dl className={styles.shortcuts}>
            {(
              [
                ["slash", "/"],
                ["bold", "Ctrl / Cmd B"],
                ["italic", "Ctrl / Cmd I"],
                ["link", "Ctrl / Cmd K"],
                ["undo", "Ctrl / Cmd Z"],
                ["redo", "Ctrl / Cmd Shift Z"],
                ["save", "Ctrl / Cmd S"],
                ["heading", "## + Space"],
                ["list", "- + Space"],
                ["quote", "> + Space"],
                ["moveBlock", "Alt / Option + Shift + ↑ / ↓"],
              ] as const
            ).map(([key, shortcut]) => (
              <div key={key}>
                <dt>{t(`shortcutLabels.${key}`)}</dt>
                <dd>
                  <kbd>{shortcut}</kbd>
                </dd>
              </div>
            ))}
          </dl>
        </Dialog>
      )}
      {imageOpen && (
        <Dialog
          title={t("blocks.image")}
          onClose={() => setImageOpen(false)}
          wide
        >
          <MediaPicker
            onSelect={(asset, alt) => {
              editor
                .chain()
                .focus()
                .insertContent({
                  type: "assetImage",
                  attrs: {
                    assetId: asset.id,
                    alt,
                    width: Math.min(
                      100,
                      Math.max(
                        20,
                        Math.round(
                          (asset.width / editor.view.dom.clientWidth) * 100,
                        ),
                      ),
                    ),
                  },
                })
                .run();
              setImageOpen(false);
            }}
          />
        </Dialog>
      )}
      {reference && (
        <ReferenceDialog
          initial={reference.value}
          onClose={() => setReference(null)}
          onSave={(value) => {
            if (reference.pos !== undefined)
              editor
                .chain()
                .focus()
                .setNodeSelection(reference.pos)
                .updateAttributes("referenceCard", value)
                .run();
            else
              editor
                .chain()
                .focus()
                .insertContent({ type: "referenceCard", attrs: value })
                .run();
            setReference(null);
          }}
        />
      )}
      {link !== null && (
        <Dialog title={t("inlineLink")} onClose={() => setLink(null)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!link.trim()) {
                editor
                  .chain()
                  .focus()
                  .extendMarkRange("link")
                  .unsetLink()
                  .run();
                setLink(null);
                return;
              }
              const result = safeWebUrl.safeParse(link);
              if (result.success) {
                editor
                  .chain()
                  .focus()
                  .extendMarkRange("link")
                  .setLink({ href: result.data })
                  .run();
                setLink(null);
              } else setLinkError(true);
            }}
          >
            <Input
              aria-label={t("referenceUrl")}
              value={link}
              onChange={(e) => setLink(e.target.value)}
            />
            {linkError && <p role="alert">{t("referenceError")}</p>}
            <Button type="submit" variant="primary">
              {t("insert")}
            </Button>
          </form>
        </Dialog>
      )}
    </div>
  );
}
