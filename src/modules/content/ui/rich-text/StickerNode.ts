import { Node } from "@tiptap/core";
import { getSticker } from "@/shared/config/stickers";

export const StickerNode = Node.create({
  name: "sticker",
  group: "inline",
  inline: true,
  atom: true,
  addOptions() {
    return { labels: {} as Record<string, string> };
  },
  addAttributes() {
    return { id: { default: "" } };
  },
  parseHTML() {
    return [
      {
        tag: "img[data-sticker]",
        getAttrs: (element) =>
          getSticker(element.getAttribute("data-sticker"))
            ? { id: element.getAttribute("data-sticker") }
            : false,
      },
    ];
  },
  renderHTML({ node }) {
    const sticker = getSticker(node.attrs.id);
    return sticker
      ? [
          "img",
          {
            "data-sticker": sticker.id,
            src: sticker.src,
            alt: this.options.labels[sticker.key] || sticker.name,
            width: 32,
            height: 32,
            draggable: "false",
          },
        ]
      : ["span", {}];
  },
  renderText({ node }) {
    return `[${getSticker(node.attrs.id)?.name ?? ""}]`;
  },
});
