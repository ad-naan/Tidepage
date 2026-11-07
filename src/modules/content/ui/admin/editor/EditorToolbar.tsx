"use client";
import { useEffect, useId, useRef, useState } from "react";
import { useEditorState } from "@tiptap/react";
import type { Editor } from "@tiptap/core";
import {
  Bold,
  Italic,
  Strikethrough,
  Link2,
  Undo2,
  Redo2,
  Plus,
  Keyboard,
  Underline,
  Highlighter,
  Superscript,
  Subscript,
  Code,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Button, IconButton } from "@/shared/ui/button/Button";
import { Select } from "@/shared/ui/select/Select";
import { Input } from "@/shared/ui/field/Input";
import { AnchoredPanel } from "@/shared/ui/overlay/AnchoredPanel";
import { OverlayScope } from "@/shared/ui/overlay/OverlayScope";
import { useDisclosure } from "@/shared/hooks/useDisclosure";
import { blockCommands, type BlockCommand } from "./block-commands";
import styles from "./editor.module.css";
import { StickerPicker } from "../../rich-text/StickerPicker";
import { DocumentTools } from "./DocumentTools";

export function EditorToolbar({
  editor,
  onInsert,
  onLink,
  onHelp,
}: {
  editor: Editor;
  onInsert: (key: BlockCommand) => void;
  onLink: () => void;
  onHelp: () => void;
}) {
  const t = useTranslations("admin.editor");
  const id = useId();
  const menu = useDisclosure(id);
  const trigger = useRef<HTMLButtonElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const filtered = blockCommands.filter((item) =>
    `${t(`blocks.${item.key}`)} ${item.keywords}`
      .toLocaleLowerCase()
      .includes(query.toLocaleLowerCase()),
  );
  useEffect(() => {
    if (menu.open) {
      setQuery("");
      search.current?.focus({ preventScroll: true });
    }
  }, [menu.open]);
  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive("bold"),
      italic: e.isActive("italic"),
      strike: e.isActive("strike"),
      underline: e.isActive("underline"),
      highlight: e.isActive("highlight"),
      superscript: e.isActive("superscript"),
      subscript: e.isActive("subscript"),
      code: e.isActive("code"),
      link: e.isActive("link"),
      block: e.isActive("heading", { level: 1 })
        ? "h1"
        : e.isActive("heading", { level: 2 })
          ? "h2"
          : e.isActive("heading", { level: 3 })
            ? "h3"
            : "paragraph",
      table: e.isActive("table"),
      codeBlock: e.isActive("codeBlock"),
      undo: e.can().undo(),
      redo: e.can().redo(),
    }),
  });
  return (
    <>
      <div className={styles.toolbar} role="toolbar" aria-label={t("toolbar")}>
        <div className={styles.toolGroup}>
          <IconButton
            aria-label={t("undo")}
            title={`${t("undo")} · Ctrl/⌘ Z`}
            disabled={!state.undo}
            onPointerDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().undo().run()}
          >
            <Undo2 size={15} />
          </IconButton>
          <IconButton
            aria-label={t("redo")}
            title={`${t("redo")} · Ctrl/⌘ Shift Z`}
            disabled={!state.redo}
            onPointerDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().redo().run()}
          >
            <Redo2 size={15} />
          </IconButton>
        </div>
        <div className={styles.blockSelect}>
          <Select
            label={t("textStyle")}
            value={state.block}
            options={(["paragraph", "h1", "h2", "h3"] as const).map(
              (value) => ({ value, label: t(`textStyles.${value}`) }),
            )}
            onValueChange={(value) => {
              const chain = editor.chain().focus();
              if (value === "paragraph") chain.setParagraph().run();
              else
                chain
                  .setHeading({ level: Number(value.slice(1)) as 1 | 2 | 3 })
                  .run();
            }}
          />
        </div>
        <div className={styles.toolGroup}>
          {(
            [
              [
                "bold",
                Bold,
                () => editor.chain().focus().toggleBold().run(),
                "B",
              ],
              [
                "italic",
                Italic,
                () => editor.chain().focus().toggleItalic().run(),
                "I",
              ],
              [
                "strike",
                Strikethrough,
                () => editor.chain().focus().toggleStrike().run(),
                "Shift S",
              ],
            ] as const
          ).map(([key, Icon, action, shortcut]) => (
            <IconButton
              key={key}
              aria-label={t(`format.${key}`)}
              title={`${t(`format.${key}`)} · Ctrl/⌘ ${shortcut}`}
              aria-pressed={state[key]}
              pressEffect={false}
              onPointerDown={(e) => e.preventDefault()}
              onClick={action}
            >
              <Icon size={15} />
            </IconButton>
          ))}
          {(
            [
              ["underline", Underline],
              ["highlight", Highlighter],
              ["code", Code],
              ["superscript", Superscript],
              ["subscript", Subscript],
            ] as const
          ).map(([key, Icon]) => (
            <IconButton
              key={key}
              aria-label={t(`format.${key}`)}
              title={t(`format.${key}`)}
              aria-pressed={state[key]}
              pressEffect={false}
              onPointerDown={(e) => e.preventDefault()}
              onClick={() => editor.chain().focus().toggleMark(key).run()}
            >
              <Icon size={15} />
            </IconButton>
          ))}
          <IconButton
            aria-label={t("inlineLink")}
            title={`${t("inlineLink")} · Ctrl/⌘ K`}
            aria-pressed={state.link}
            onPointerDown={(e) => e.preventDefault()}
            onClick={onLink}
          >
            <Link2 size={15} />
          </IconButton>
        </div>
        <StickerPicker
          disabled={state.codeBlock}
          onSelect={(id) =>
            editor
              .chain()
              .focus()
              .insertContent({ type: "sticker", attrs: { id } })
              .run()
          }
        />
        <OverlayScope owner={id}>
          <div ref={menu.ref} className={styles.insertTrigger}>
            <Button
              ref={trigger}
              size="sm"
              aria-expanded={menu.open}
              aria-controls={id}
              onClick={menu.toggle}
              onKeyDown={(event) => {
                if (event.key === "ArrowDown") {
                  event.preventDefault();
                  menu.setOpen(true);
                }
              }}
            >
              <Plus size={15} />
              {t("insertMenu")}
            </Button>
            <AnchoredPanel
              open={menu.open}
              anchor={trigger.current}
              id={id}
              label={t("insertMenu")}
              width={260}
              align="end"
              className={styles.insertPanel}
            >
              <div
                className={styles.commandList}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    trigger.current?.focus({ preventScroll: true });
                    return;
                  }
                  if (
                    e.target === search.current &&
                    ["Home", "End"].includes(e.key)
                  )
                    return;
                  if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key))
                    return;
                  e.preventDefault();
                  const buttons = Array.from(
                    e.currentTarget.querySelectorAll<HTMLButtonElement>(
                      "button",
                    ),
                  );
                  const current = buttons.indexOf(
                    document.activeElement as HTMLButtonElement,
                  );
                  const next =
                    e.key === "Home"
                      ? 0
                      : e.key === "End"
                        ? buttons.length - 1
                        : current < 0
                          ? e.key === "ArrowDown"
                            ? 0
                            : buttons.length - 1
                          : (current +
                              (e.key === "ArrowDown"
                                ? 1
                                : buttons.length - 1)) %
                            buttons.length;
                  buttons[next]?.focus();
                }}
              >
                <Input
                  ref={search}
                  className={styles.commandSearch}
                  aria-label={t("slashSearch")}
                  placeholder={t("slashSearch")}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                {!filtered.length && (
                  <p className={styles.noCommands}>{t("noCommands")}</p>
                )}
                {filtered.map(({ key, icon: Icon }) => (
                  <Button
                    key={key}
                    className={styles.command}
                    pressEffect={false}
                    onClick={() => {
                      menu.setOpen(false);
                      onInsert(key);
                    }}
                  >
                    <Icon size={16} />
                    <span>{t(`blocks.${key}`)}</span>
                  </Button>
                ))}
              </div>
            </AnchoredPanel>
          </div>
        </OverlayScope>
        <IconButton
          className={styles.helpTrigger}
          aria-label={t("shortcuts")}
          title={t("shortcuts")}
          onClick={onHelp}
        >
          <Keyboard size={16} />
        </IconButton>
        <DocumentTools editor={editor} />
      </div>
      {state.table && (
        <div className={styles.tableTools} aria-label={t("blocks.table")}>
          <small>{t("blocks.table")}</small>
          <Button
            size="sm"
            onClick={() => editor.chain().focus().addRowAfter().run()}
          >
            {t("addRow")}
          </Button>
          <Button
            size="sm"
            onClick={() => editor.chain().focus().addColumnAfter().run()}
          >
            {t("addColumn")}
          </Button>
          <Button
            size="sm"
            onClick={() => editor.chain().focus().deleteRow().run()}
          >
            {t("deleteRow")}
          </Button>
          <Button
            size="sm"
            onClick={() => editor.chain().focus().deleteColumn().run()}
          >
            {t("deleteColumn")}
          </Button>
          <Button
            size="sm"
            onClick={() => editor.chain().focus().deleteTable().run()}
          >
            {t("deleteTable")}
          </Button>
        </div>
      )}
    </>
  );
}
