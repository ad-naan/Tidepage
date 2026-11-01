import { test } from "node:test";
import assert from "node:assert/strict";
import ts from "typescript";
import {
  inspectUiSource,
  presentationImportError,
} from "../scripts/ui-architecture-rules.mjs";

function inspect(text, path = "modules/content/ui/Example.tsx") {
  return inspectUiSource(
    ts.createSourceFile(
      path,
      text,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    ),
    path,
  );
}
test("business views cannot bypass shared action, field, link or disclosure primitives", () => {
  const errors = inspect(
    "const view=<><button/><motion.button/><input/><textarea/><a/><details><summary/></details></>;",
  );
  assert.equal(errors.length, 7);
  assert.equal(
    inspect(
      "const view=<><Button/><Input/><Textarea/><Anchor/><Disclosure summary='More'/></>;",
    ).length,
    0,
  );
});
test("native controls are allowed only in their owning primitive", () => {
  assert.equal(
    inspect("const view=<motion.button/>;", "shared/ui/button/Button.tsx")
      .length,
    0,
  );
  assert.equal(
    inspect("const view=<input/>;", "shared/ui/button/Button.tsx").length,
    1,
  );
  assert.equal(
    inspect("const view=<input/>;", "shared/ui/field/Input.tsx").length,
    0,
  );
});
test("presentation dependencies point from routes to widgets to business modules", () => {
  assert.ok(
    presentationImportError(
      "modules/content/ui/View.tsx",
      "widgets/site-shell/SiteShell.tsx",
    ),
  );
  assert.ok(
    presentationImportError("widgets/site-shell/SiteShell.tsx", "app/page.tsx"),
  );
  assert.ok(
    presentationImportError(
      "server/cache/redis.ts",
      "modules/content/ui/articles/ArticleList.tsx",
    ),
  );
  assert.equal(
    presentationImportError(
      "widgets/site-shell/SiteShell.tsx",
      "modules/content/ui/articles/ArticleList.tsx",
    ),
    undefined,
  );
});
