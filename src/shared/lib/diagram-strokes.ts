import { RoughGenerator } from "roughjs/bin/generator";
import type { Drawable, PathInfo } from "roughjs/bin/core";
import type { PositionedNode } from "./diagram-layout";

const generator = new RoughGenerator();

function seedFor(id: string) {
  let value = 2166136261;
  for (const char of id)
    value = Math.imul(value ^ char.codePointAt(0)!, 16777619);
  return value >>> 0 || 1;
}

export type DiagramStroke = PathInfo & { opacity: number };
function paths(shape: Drawable): DiagramStroke[] {
  return generator.toPaths(shape).map((path) => ({
    ...path,
    opacity:
      path.fill && path.fill !== "none"
        ? 0.09
        : path.strokeWidth < 1
          ? 0.18
          : 1,
  }));
}

/** Pure generator calls: no canvas, DOM, random render-time seeds or editor runtime. */
export function diagramNodeStrokes(node: PositionedNode, color: string) {
  const { width, height } = node;
  const options = {
    seed: seedFor(node.id),
    roughness: 1.05,
    bowing: 0.85,
    stroke: color,
    strokeWidth: 1.25,
    fill: node.tone === "ink" ? undefined : color,
    fillStyle: node.tone === "sea" ? "solid" : "hachure",
    fillWeight: 0.55,
    hachureGap: 11,
    hachureAngle: -41,
    preserveVertices: true,
    fixedDecimalPlaceDigits: 2,
  };
  const shape =
    node.shape === "decision"
      ? generator.polygon(
          [
            [width / 2, 0],
            [width, height / 2],
            [width / 2, height],
            [0, height / 2],
          ],
          options,
        )
      : node.shape === "pill"
        ? generator.ellipse(width / 2, height / 2, width, height, options)
        : generator.path(
            `M8 0 H${width - 8} Q${width} 0 ${width} 8 V${height - 8} Q${width} ${height} ${width - 8} ${height} H8 Q0 ${height} 0 ${height - 8} V8 Q0 0 8 0Z`,
            options,
          );
  return paths(shape);
}

export function diagramLineStrokes(
  path: string,
  id: string,
  arrowhead = false,
) {
  return paths(
    generator.path(path, {
      seed: seedFor(id),
      roughness: arrowhead ? 0.5 : 0.9,
      bowing: 1,
      strokeWidth: 1.15,
      stroke: "var(--ink, #30332f)",
      preserveVertices: true,
      fixedDecimalPlaceDigits: 2,
    }),
  );
}
