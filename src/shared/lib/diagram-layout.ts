import type { MiniDiagram, DiagramNode } from "@/shared/contracts/diagram";

/** Approximate advance widths without browser font measurements, including CJK. */
export function diagramLines(text: string, capacity = 22): string[] {
  const lines: string[] = [];
  let line = "";
  let width = 0;
  for (const char of text) {
    const advance = /[\u0000-\u007f]/.test(char) ? 1 : 1.85;
    if (char === "\n" || width + advance > capacity) {
      lines.push(line);
      line = "";
      width = 0;
    }
    if (char !== "\n") {
      line += char;
      width += advance;
    }
  }
  if (line || !lines.length) lines.push(line);
  return lines;
}

export type PositionedNode = DiagramNode & {
  x: number;
  y: number;
  width: number;
  height: number;
  lines: string[];
  rank: number;
};

const textWidth = (line: string) =>
  Array.from(line).reduce(
    (width, char) => width + (/[\u0000-\u007f]/.test(char) ? 8.4 : 15.5),
    0,
  );

function connectionPoint(
  node: PositionedNode,
  vertical: boolean,
  after: boolean,
  index: number,
  count: number,
) {
  const crossRadius = (vertical ? node.width : node.height) / 2;
  const offset =
    (index - (count - 1) / 2) *
    Math.min(32, crossRadius / Math.max(1, count - 1));
  const primaryRadius = (vertical ? node.height : node.width) / 2;
  const extent =
    node.shape === "decision"
      ? primaryRadius * (1 - Math.abs(offset) / crossRadius)
      : node.shape === "pill"
        ? primaryRadius * Math.sqrt(1 - (offset / crossRadius) ** 2)
        : primaryRadius;
  const distance = (after ? 1 : -1) * (extent + 8);
  return {
    x: node.x + node.width / 2 + (vertical ? offset : distance),
    y: node.y + node.height / 2 + (vertical ? distance : offset),
  };
}

export function layoutDiagram(value: MiniDiagram) {
  const vertical = value.direction === "vertical";
  const ranks = new Map(value.nodes.map((node) => [node.id, 0]));
  const pending = new Map(value.nodes.map((node) => [node.id, 0]));
  value.edges.forEach((edge) =>
    pending.set(edge.to, pending.get(edge.to)! + 1),
  );
  const queue = value.nodes
    .filter((node) => !pending.get(node.id))
    .map((node) => node.id);
  const visited = new Set<string>();
  for (let index = 0; index < queue.length; index++) {
    const id = queue[index];
    visited.add(id);
    for (const edge of value.edges.filter((edge) => edge.from === id)) {
      ranks.set(edge.to, Math.max(ranks.get(edge.to)!, ranks.get(id)! + 1));
      pending.set(edge.to, pending.get(edge.to)! - 1);
      if (!pending.get(edge.to)) queue.push(edge.to);
    }
  }
  // Give cyclic components a stable order; their return edges use outside lanes.
  let next = visited.size ? Math.max(...ranks.values()) + 1 : 0;
  value.nodes
    .filter((node) => !visited.has(node.id))
    .forEach((node) => ranks.set(node.id, next++));
  const layers = new Map<number, PositionedNode[]>();
  value.nodes.forEach((node) => {
    const lines = diagramLines(node.label, node.shape === "decision" ? 18 : 22);
    const rank = ranks.get(node.id)!;
    const labelWidth = Math.max(...lines.map(textWidth));
    const placed = {
      ...node,
      rank,
      lines,
      x: 0,
      y: 0,
      width:
        node.shape === "decision"
          ? Math.max(176, labelWidth * 1.65 + 32)
          : Math.max(node.shape === "pill" ? 112 : 144, labelWidth + 48),
      height: Math.max(
        node.shape === "pill" ? 54 : node.shape === "decision" ? 100 : 64,
        node.shape === "decision"
          ? lines.length * 44 + 32
          : lines.length * 22 + 30,
      ),
    };
    layers.set(rank, [...(layers.get(rank) ?? []), placed]);
  });
  const ordered = [...layers.entries()].sort(([a], [b]) => a - b);
  const spanOf = (nodes: PositionedNode[]) =>
    nodes.reduce(
      (sum, node) => sum + (vertical ? node.width : node.height) + 40,
      -40,
    );
  const crossSize = Math.max(...ordered.map(([, nodes]) => spanOf(nodes)));
  let primary = 32;
  for (const [, nodes] of ordered) {
    const span = spanOf(nodes);
    const depth = Math.max(
      ...nodes.map((node) => (vertical ? node.height : node.width)),
    );
    let cross = 32 + (crossSize - span) / 2;
    for (const node of nodes) {
      node.x = vertical ? cross : primary + (depth - node.width) / 2;
      node.y = vertical ? primary + (depth - node.height) / 2 : cross;
      cross += (vertical ? node.width : node.height) + 40;
    }
    primary += depth + (vertical ? 72 : 96);
  }
  const nodes = value.nodes.map((node) =>
    ordered.flatMap(([, layer]) => layer).find((item) => item.id === node.id)!,
  );
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const right = Math.max(...nodes.map((node) => node.x + node.width));
  const bottom = Math.max(...nodes.map((node) => node.y + node.height));
  let lane = 0;
  const edges = value.edges.map((edge) => {
    const from = byId.get(edge.from)!;
    const to = byId.get(edge.to)!;
    const adjacent = to.rank === from.rank + 1;
    if (adjacent) {
      const outgoing = value.edges.filter((item) => item.from === edge.from);
      const incoming = value.edges.filter((item) => item.to === edge.to);
      const { x: x1, y: y1 } = connectionPoint(
        from,
        vertical,
        true,
        outgoing.indexOf(edge),
        outgoing.length,
      );
      const { x: x2, y: y2 } = connectionPoint(
        to,
        vertical,
        false,
        incoming.indexOf(edge),
        incoming.length,
      );
      const mx = (x1 + x2) / 2;
      const my = (y1 + y2) / 2;
      return {
        ...edge,
        path: vertical
          ? `M${x1} ${y1} C${x1} ${my},${x2} ${my},${x2} ${y2}`
          : `M${x1} ${y1} C${mx} ${y1},${mx} ${y2},${x2} ${y2}`,
        arrow: vertical
          ? `M${x2 - 4} ${y2 - 7} L${x2} ${y2} L${x2 + 4} ${y2 - 7}`
          : `M${x2 - 7} ${y2 - 4} L${x2} ${y2} L${x2 - 7} ${y2 + 4}`,
        labelX: mx,
        labelY: my,
      };
    }
    const outside = (vertical ? right : bottom) + 32 + lane++ * 28;
    const x1 = vertical ? from.x + from.width + 8 : from.x + from.width / 2;
    const y1 = vertical ? from.y + from.height / 2 : from.y + from.height + 8;
    const x2 = vertical ? to.x + to.width + 8 : to.x + to.width / 2;
    const y2 = vertical ? to.y + to.height / 2 : to.y + to.height + 8;
    return {
      ...edge,
      path: vertical
        ? `M${x1} ${y1} L${outside} ${y1} L${outside} ${y2} L${x2} ${y2}`
        : `M${x1} ${y1} L${x1} ${outside} L${x2} ${outside} L${x2} ${y2}`,
      arrow: vertical
        ? `M${x2 + 7} ${y2 - 4} L${x2} ${y2} L${x2 + 7} ${y2 + 4}`
        : `M${x2 - 4} ${y2 + 7} L${x2} ${y2} L${x2 + 4} ${y2 + 7}`,
      labelX: vertical ? outside : (x1 + x2) / 2,
      labelY: vertical ? (y1 + y2) / 2 : outside,
    };
  });
  return {
    nodes,
    edges,
    width: right + 32 + (vertical && lane ? 80 + lane * 28 : 0),
    height: bottom + 32 + (!vertical && lane ? 48 + lane * 28 : 0),
  };
}
