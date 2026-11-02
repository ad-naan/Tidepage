import { refractor } from "refractor";
import powershell from "refractor/powershell";
import tsx from "refractor/tsx";
import { type ReactNode } from "react";
refractor.register(powershell);
refractor.register(tsx);
type Token = ReturnType<typeof refractor.highlight>["children"][number];
function renderToken(token: Token, key: number): ReactNode {
  if (token.type === "text") return token.value;
  if (token.type !== "element") return null;
  const classes = token.properties.className;
  return (
    <span
      key={key}
      data-token={
        Array.isArray(classes) ? classes.join(" ") : String(classes ?? "")
      }
    >
      {token.children.map(renderToken)}
    </span>
  );
}
export function HighlightedCode({
  code,
  language,
}: {
  code: string;
  language: string;
}) {
  return code.length <= 50000 && refractor.registered(language)
    ? refractor.highlight(code, language).children.map(renderToken)
    : code;
}
