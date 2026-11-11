import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

export const assistantTargetKey = new PluginKey<DecorationSet>(
  "assistantTarget",
);

/** Keep the source passage visible when focus moves into an AI composer. */
export const AssistantTarget = Extension.create({
  name: "assistantTarget",
  addOptions() {
    return { className: "" };
  },
  addProseMirrorPlugins() {
    const className = this.options.className;
    return [
      new Plugin({
        key: assistantTargetKey,
        state: {
          init: () => DecorationSet.empty,
          apply(transaction, previous) {
            const range = transaction.getMeta(assistantTargetKey) as
              { from: number; to: number } | null | undefined;
            if (range === undefined)
              return previous.map(transaction.mapping, transaction.doc);
            return range && range.from < range.to
              ? DecorationSet.create(transaction.doc, [
                  Decoration.inline(range.from, range.to, { class: className }),
                ])
              : DecorationSet.empty;
          },
        },
        props: { decorations: (state) => assistantTargetKey.getState(state) },
      }),
    ];
  },
});
