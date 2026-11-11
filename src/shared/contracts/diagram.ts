import { z } from "zod";

const id = z.string().regex(/^[a-zA-Z][a-zA-Z0-9_-]{0,39}$/);
export const diagramNodeSchema = z
  .object({
    id,
    label: z.string().trim().min(1).max(60),
    shape: z.enum(["box", "decision", "pill"]),
    tone: z.enum(["ink", "warm", "sea"]),
  })
  .strict();
export const diagramEdgeSchema = z
  .object({ from: id, to: id, label: z.string().trim().max(24) })
  .strict();
export const diagramSchema = z
  .object({
    version: z.literal(1),
    title: z.string().trim().min(1).max(120),
    caption: z.string().max(300),
    direction: z.enum(["vertical", "horizontal"]),
    nodes: z.array(diagramNodeSchema).min(1).max(12),
    edges: z.array(diagramEdgeSchema).max(18),
  })
  .strict()
  .superRefine((value, ctx) => {
    const ids = new Set(value.nodes.map((node) => node.id));
    const edges = new Set<string>();
    if (ids.size !== value.nodes.length)
      ctx.addIssue({ code: "custom", message: "Duplicate node IDs" });
    value.edges.forEach((edge, index) => {
      const key = `${edge.from}:${edge.to}`;
      if (
        !ids.has(edge.from) ||
        !ids.has(edge.to) ||
        edge.from === edge.to ||
        edges.has(key)
      )
        ctx.addIssue({
          code: "custom",
          path: ["edges", index],
          message: "Invalid connection",
        });
      edges.add(key);
    });
  });
export type MiniDiagram = z.infer<typeof diagramSchema>;
export type DiagramNode = MiniDiagram["nodes"][number];

export function diagramText(value: MiniDiagram) {
  const labels = new Map(value.nodes.map((node) => [node.id, node.label]));
  return [
    value.title,
    ...value.nodes.map((node) => node.label),
    ...value.edges.map(
      (edge) =>
        `${labels.get(edge.from)} → ${labels.get(edge.to)}${edge.label ? ` (${edge.label})` : ""}`,
    ),
    value.caption,
  ]
    .filter(Boolean)
    .join("\n");
}
