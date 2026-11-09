import { Mark } from "@tiptap/core";
import { fontSizes, isFontSize } from "@/shared/contracts/rich-text";

export const FontSizeMark = Mark.create({
  name: "fontSize",
  addAttributes() {
    return { size: { isRequired: true } };
  },
  parseHTML: () => [
    {
      style: "font-size",
      getAttrs: (value) => {
        const size = fontSizes.find((size) => value === `${size}px`);
        return size === undefined ? false : { size };
      },
    },
  ],
  renderHTML: ({ mark }) => {
    const { size } = mark.attrs;
    return [
      "span",
      isFontSize(size) ? { style: `font-size: ${size}px` } : {},
      0,
    ];
  },
});

export const HighlightMark = Mark.create({
  name: "highlight",
  parseHTML: () => [{ tag: "mark" }],
  renderHTML: ({ HTMLAttributes }) => ["mark", HTMLAttributes, 0],
  addKeyboardShortcuts() {
    return { "Mod-Shift-h": () => this.editor.commands.toggleMark(this.name) };
  },
});
export const SuperscriptMark = Mark.create({
  name: "superscript",
  excludes: "subscript",
  parseHTML: () => [{ tag: "sup" }],
  renderHTML: ({ HTMLAttributes }) => ["sup", HTMLAttributes, 0],
});
export const SubscriptMark = Mark.create({
  name: "subscript",
  excludes: "superscript",
  parseHTML: () => [{ tag: "sub" }],
  renderHTML: ({ HTMLAttributes }) => ["sub", HTMLAttributes, 0],
});
