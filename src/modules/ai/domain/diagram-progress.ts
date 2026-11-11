import {
  diagramNodeSchema,
  diagramEdgeSchema,
  diagramSchema,
  type MiniDiagram,
} from "@/shared/contracts/diagram";

/** Only complete, independently validated JSON objects become preview elements. */
function objects(source: string, key: string): unknown[] {
  const match = new RegExp(`"${key}"\\s*:\\s*\\[`).exec(source);
  if (!match) return [];
  const result: unknown[] = [];
  let start = -1,
    depth = 0,
    quoted = false,
    escaped = false;
  for (
    let index = match.index + match[0].length;
    index < source.length;
    index++
  ) {
    const char = source[index];
    if (quoted) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === '"') quoted = false;
      continue;
    }
    if (char === '"') quoted = true;
    else if (char === "{") {
      if (!depth) start = index;
      depth++;
    } else if (char === "}") {
      depth--;
      if (!depth && start >= 0) {
        try {
          result.push(JSON.parse(source.slice(start, index + 1)));
        } catch {
          return result;
        }
        start = -1;
      }
    } else if (char === "]" && !depth) break;
    if (result.length >= 18) break;
  }
  return result;
}

export function diagramProgress(
  source: string,
  fallback?: MiniDiagram,
): MiniDiagram | null {
  const nodes = objects(source, "nodes")
    .flatMap((item) => {
      const parsed = diagramNodeSchema.safeParse(item);
      return parsed.success ? [parsed.data] : [];
    })
    .slice(0, 12);
  if (!nodes.length) return null;
  const ids = new Set(nodes.map((node) => node.id));
  const edges = objects(source, "edges").flatMap((item) => {
    const parsed = diagramEdgeSchema.safeParse(item);
    return parsed.success &&
      ids.has(parsed.data.from) &&
      ids.has(parsed.data.to)
      ? [parsed.data]
      : [];
  });
  const title = /"title"\s*:\s*("(?:\\.|[^"\\])*")/.exec(source);
  const direction = /"direction"\s*:\s*"(vertical|horizontal)"/.exec(
    source,
  )?.[1];
  let heading = fallback?.title ?? "";
  if (title) {
    try {
      heading = JSON.parse(title[1]);
    } catch {
      /* Wait for a complete title. */
    }
  }
  const parsed = diagramSchema.safeParse({
    version: 1,
    title: heading,
    caption: "",
    direction: direction ?? fallback?.direction ?? "vertical",
    nodes,
    edges,
  });
  return parsed.success ? parsed.data : null;
}
