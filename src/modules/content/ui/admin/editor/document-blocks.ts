import { closeHistory } from "@tiptap/pm/history";
import {
  NodeSelection,
  Selection,
  TextSelection,
  type EditorState,
  type Transaction,
} from "@tiptap/pm/state";

export const blockActions = [
  "up",
  "down",
  "duplicate",
  "insertBelow",
  "remove",
] as const;
export type BlockAction = (typeof blockActions)[number];

export function currentBlock(state: EditorState) {
  const { from, to } = state.selection;
  const block = state.doc.childAfter(from);
  return block.node && to <= block.offset + block.node.nodeSize ? block : null;
}

export function editCurrentBlock(
  state: EditorState,
  action: BlockAction,
): Transaction | null {
  const block = currentBlock(state);
  if (!block?.node) return null;
  const { node, offset, index } = block;
  const end = offset + node.nodeSize;
  const tr = closeHistory(state.tr);
  if (action === "remove" || action === "insertBelow") {
    const paragraph = state.schema.nodes.paragraph.create();
    const pos = action === "insertBelow" ? end : offset;
    if (action === "insertBelow") tr.insert(pos, paragraph);
    else if (state.doc.childCount === 1) tr.replaceWith(pos, end, paragraph);
    else tr.delete(pos, end);
    return tr
      .setSelection(Selection.near(tr.doc.resolve(pos)))
      .scrollIntoView();
  }
  let nextPosition: number;
  if (action === "duplicate") {
    let uploading = Boolean(node.attrs.uploadKey);
    node.descendants((child) => {
      if (child.attrs.uploadKey) uploading = true;
    });
    if (uploading) return null;
    tr.insert(end, node);
    nextPosition = end;
  } else {
    const sibling = state.doc.maybeChild(index + (action === "up" ? -1 : 1));
    if (!sibling) return null;
    if (action === "up") {
      nextPosition = offset - sibling.nodeSize;
      tr.replaceWith(nextPosition, end, [node, sibling]);
    } else {
      nextPosition = offset + sibling.nodeSize;
      tr.replaceWith(offset, end + sibling.nodeSize, [sibling, node]);
    }
  }
  const delta = nextPosition - offset;
  const { selection } = state;
  return tr
    .setSelection(
      selection instanceof NodeSelection
        ? NodeSelection.create(tr.doc, selection.anchor + delta)
        : selection instanceof TextSelection
          ? TextSelection.create(
              tr.doc,
              selection.anchor + delta,
              selection.head + delta,
            )
          : Selection.near(tr.doc.resolve(nextPosition + 1)),
    )
    .scrollIntoView();
}
