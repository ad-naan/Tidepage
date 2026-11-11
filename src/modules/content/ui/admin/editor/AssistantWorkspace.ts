import { Extension } from "@tiptap/core";
import type { Selection } from "@tiptap/pm/state";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

export const assistantWorkspaceKey = new PluginKey<DecorationSet>(
  "assistantWorkspace",
);

/** Keep the workspace outside paragraphs, lists and tables, without adding saved content. */
export function assistantWorkspacePosition(selection: Selection) {
  const { $to } = selection;
  return $to.depth ? $to.after(1) : $to.pos;
}

export function createAssistantWorkspacePlugin() {
  return new Plugin({
    key: assistantWorkspaceKey,
    state: {
      init: () => DecorationSet.empty,
      apply(tr, previous) {
        const workspace = tr.getMeta(assistantWorkspaceKey) as
          { pos: number; element: HTMLElement } | null | undefined;
        if (workspace === undefined) return previous.map(tr.mapping, tr.doc);
        return workspace
          ? DecorationSet.create(tr.doc, [
              Decoration.widget(workspace.pos, workspace.element, {
                side: 1,
                stopEvent: () => true,
                ignoreSelection: true,
              }),
            ])
          : DecorationSet.empty;
      },
    },
    props: {
      decorations: (state) => assistantWorkspaceKey.getState(state),
    },
  });
}

export const AssistantWorkspace = Extension.create({
  name: "assistantWorkspace",
  addProseMirrorPlugins() {
    return [createAssistantWorkspacePlugin()];
  },
});
