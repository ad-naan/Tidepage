import { test } from "node:test";
import assert from "node:assert/strict";
import { notePresentation } from "../../src/modules/content/ui/notes/note-presentation";
import type { Note } from "../../src/modules/content/domain/models";

const note: Note = {
  id: "note",
  locale: "zh-CN",
  date: "Today",
  publishedOn: "2026-01-01",
  mood: "",
  text: "A note",
  tag: "",
  sketch: "boat",
};
test("note reader separates ordered photos without mutating or losing rich text", () => {
  const first = `/uploads/${"a".repeat(64)}.jpg`;
  const second = `/uploads/${"b".repeat(64)}.png`;
  const source: Note = {
    ...note,
    body: {
      type: "doc",
      content: [
        { type: "heading", content: [{ type: "text", text: "Heading" }] },
        {
          type: "assetImage",
          attrs: { assetId: first, alt: "First", caption: "Caption" },
        },
        {
          type: "blockquote",
          content: [
            { type: "assetImage", attrs: { assetId: second } },
            {
              type: "paragraph",
              content: [
                { type: "text", text: "Kept", marks: [{ type: "bold" }] },
              ],
            },
          ],
        },
        { type: "assetImage", attrs: { assetId: "javascript:alert(1)" } },
      ],
    },
  };
  const before = JSON.stringify(source);
  const result = notePresentation(source);
  assert.deepEqual(result.images, [
    { src: first, alt: "First", caption: "Caption" },
    { src: second, alt: "", caption: "" },
  ]);
  assert.equal(result.body?.content?.length, 2);
  assert.equal(
    result.body?.content?.[1].content?.[0].content?.[0].marks?.[0].type,
    "bold",
  );
  assert.equal(JSON.stringify(source), before);
  assert.deepEqual(notePresentation(note), { images: [], body: undefined });
});
