import ts from "typescript";

const nativeOwners = {
  button: "shared/ui/button/Button.tsx",
  input: "shared/ui/field/Input.tsx",
  textarea: "shared/ui/field/Textarea.tsx",
  select: "shared/ui/select/Select.tsx",
  a: "shared/ui/link/Anchor.tsx",
  dialog: "shared/ui/dialog/Dialog.tsx",
  details: "shared/ui/disclosure/Disclosure.tsx",
  summary: "shared/ui/disclosure/Disclosure.tsx",
};

/** Kept pure so the policy itself can be checked with small violating fixtures. */
export function inspectUiSource(source, path) {
  const errors = [];
  function visit(node) {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const tag = node.tagName.getText(source);
      const native = tag.replace(/^(?:motion|m)\./, "");
      const owner = nativeOwners[native];
      if (owner && path !== owner)
        errors.push(
          `${path}: <${tag}> must use the shared UI primitive (${owner})`,
        );
      if (tag === "Input") {
        for (const attribute of node.attributes.properties) {
          if (
            ts.isJsxAttribute(attribute) &&
            attribute.name.text === "type" &&
            attribute.initializer &&
            ts.isStringLiteral(attribute.initializer) &&
            ["range", "file"].includes(attribute.initializer.text)
          )
            errors.push(
              `${path}: use RangeSlider or FileInput instead of Input type=${attribute.initializer.text}`,
            );
        }
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  return errors;
}

export function presentationImportError(path, destination) {
  if (path.startsWith("modules/") && /^(widgets|app)\//.test(destination))
    return `${path}: a business module must not depend on composition layer ${destination}`;
  if (path.startsWith("widgets/") && destination.startsWith("app/"))
    return `${path}: widgets must not depend on routes (${destination})`;
  if (
    path.startsWith("server/") &&
    /^(widgets|modules\/[^/]+\/ui)\//.test(destination)
  )
    return `${path}: server infrastructure must not depend on presentation (${destination})`;
}
