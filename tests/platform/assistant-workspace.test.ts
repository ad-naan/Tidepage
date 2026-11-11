import { test } from "node:test";
import assert from "node:assert/strict";
import { Schema } from "@tiptap/pm/model";
import { EditorState, TextSelection, NodeSelection } from "@tiptap/pm/state";
import { history, undo } from "@tiptap/pm/history";
import {
  assistantWorkspaceKey,
  assistantWorkspacePosition,
  createAssistantWorkspacePlugin,
} from "../../src/modules/content/ui/admin/editor/AssistantWorkspace";

const schema = new Schema({
  nodes: {
    doc: { content: "block+" },
    paragraph: { group: "block", content: "text*" },
    blockquote: { group: "block", content: "block+" },
    text: {},
  },
});
const paragraph = (text: string) =>
  schema.node("paragraph", null, schema.text(text));

test("AI review is placed after the containing top-level block for text, nested and node selections", () => {
  const first = paragraph("First");
  const quote = schema.node("blockquote", null, paragraph("Nested"));
  const doc = schema.node("doc", null, [first, quote, paragraph("Last")]);
  assert.equal(
    assistantWorkspacePosition(TextSelection.create(doc, 2, 4)),
    first.nodeSize,
  );
  assert.equal(
    assistantWorkspacePosition(TextSelection.create(doc, first.nodeSize + 3)),
    first.nodeSize + quote.nodeSize,
  );
  assert.equal(
    assistantWorkspacePosition(NodeSelection.create(doc, first.nodeSize)),
    first.nodeSize + quote.nodeSize,
  );
});

test("opening and closing AI review does not change saved content or add an undo step; placement follows edits", () => {
  const doc = schema.node("doc", null, [paragraph("First"), paragraph("Last")]);
  let state = EditorState.create({
    doc,
    plugins: [history(), createAssistantWorkspacePlugin()],
  });
  const original = state.doc.toJSON();
  // The widget DOM is only used by an EditorView. These state tests need no browser.
  const element = {} as HTMLElement;
  const open = state.tr.setMeta(assistantWorkspaceKey, {
    pos: doc.firstChild!.nodeSize,
    element,
  });
  assert.equal(open.docChanged, false);
  state = state.apply(open);
  assert.deepEqual(state.doc.toJSON(), original);
  assert.equal(undo(state), false);
  assert.equal(assistantWorkspaceKey.getState(state)?.find().length, 1);
  state = state.apply(state.tr.insertText("New ", 1));
  assert.equal(
    assistantWorkspaceKey.getState(state)?.find()[0].from,
    doc.firstChild!.nodeSize + 4,
  );
  state = state.apply(state.tr.setMeta(assistantWorkspaceKey, null));
  assert.equal(assistantWorkspaceKey.getState(state)?.find().length, 0);
  assert.ok(undo(state, (tr) => assert.deepEqual(tr.doc.toJSON(), original)));
});
