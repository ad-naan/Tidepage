import type { MiniDiagram as Diagram } from "@/shared/contracts/diagram";
import { diagramText } from "@/shared/contracts/diagram";
import { layoutDiagram, diagramLines } from "@/shared/lib/diagram-layout";
import {
  diagramNodeStrokes,
  diagramLineStrokes,
  type DiagramStroke,
} from "@/shared/lib/diagram-strokes";
import styles from "./MiniDiagram.module.css";
import "@fontsource/lxgw-wenkai-tc/400.css";

function Strokes({ paths }: { paths: DiagramStroke[] }) {
  return paths.map((path, index) => (
    <path
      key={index}
      d={path.d}
      stroke={path.stroke}
      strokeWidth={path.strokeWidth}
      fill={path.fill ?? "none"}
      opacity={path.opacity}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ));
}

/** One deterministic SVG renderer for reading, editing, SSR and export. */
export function MiniDiagram({ value }: { value: Diagram }) {
  const layout = layoutDiagram(value);
  return (
    <figure className={styles.figure}>
      <figcaption className={styles.title}>{value.title}</figcaption>
      <div
        className={styles.scroll}
        tabIndex={0}
        role="region"
        aria-label={value.title}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width={layout.width}
          height={layout.height}
          viewBox={`0 0 ${layout.width} ${layout.height}`}
          role="img"
          aria-label={value.title}
          className={styles.svg}
        >
          <title>{value.title}</title>
          <desc>{diagramText(value)}</desc>
          <g
            fill="none"
            stroke="var(--ink, #30332f)"
            strokeWidth="1.35"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {layout.edges.map((edge) => {
              const lines = diagramLines(
                edge.label,
                value.direction === "vertical" ? 18 : 9,
              );
              const labelWidth = value.direction === "vertical" ? 156 : 80;
              return (
                <g key={`${edge.from}:${edge.to}`}>
                  <Strokes
                    paths={diagramLineStrokes(
                      edge.path,
                      `${edge.from}:${edge.to}`,
                    )}
                  />
                  <Strokes
                    paths={diagramLineStrokes(
                      edge.arrow,
                      `${edge.from}:${edge.to}:head`,
                      true,
                    )}
                  />
                  {edge.label && (
                    <g stroke="none">
                      <rect
                        x={edge.labelX - labelWidth / 2}
                        y={edge.labelY - lines.length * 9}
                        width={labelWidth}
                        height={lines.length * 18 + 4}
                        rx="5"
                        fill="var(--paper, #faf9f5)"
                      />
                      <text
                        x={edge.labelX}
                        textAnchor="middle"
                        fill="var(--ink, #30332f)"
                        fontSize="14"
                        fontFamily="var(--font-diagram, sans-serif)"
                      >
                        {lines.map((line, index, lines) => (
                          <tspan
                            key={index}
                            x={edge.labelX}
                            y={
                              edge.labelY +
                              (index - (lines.length - 1) / 2) * 18 +
                              4
                            }
                          >
                            {line}
                          </tspan>
                        ))}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}
          </g>
          {layout.nodes.map((node) => {
            const color =
              node.tone === "warm"
                ? "var(--accent, #c16a35)"
                : node.tone === "sea"
                  ? "var(--diagram-sea, #557d79)"
                  : "var(--ink, #30332f)";
            return (
              <g key={node.id} transform={`translate(${node.x} ${node.y})`}>
                <Strokes paths={diagramNodeStrokes(node, color)} />
                <text
                  textAnchor="middle"
                  fill="var(--ink, #30332f)"
                  fontFamily="var(--font-diagram, sans-serif)"
                  fontSize="16"
                  fontWeight="400"
                  stroke="var(--paper, #faf9f5)"
                  strokeWidth="4"
                  paintOrder="stroke"
                  strokeLinejoin="round"
                >
                  {node.lines.map((line, index) => (
                    <tspan
                      key={index}
                      x={node.width / 2}
                      y={
                        node.height / 2 +
                        (index - (node.lines.length - 1) / 2) * 22 +
                        5
                      }
                    >
                      {line}
                    </tspan>
                  ))}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      {value.caption && <div className={styles.caption}>{value.caption}</div>}
    </figure>
  );
}
