"use client";
import { Anchor } from "@/shared/ui/link/Anchor";
import { useEffect, useState } from "react";
import { CoastGlyph } from "@/shared/ui/drawing/CoastalMarks";
import { HanddrawnMark } from "@/shared/ui/drawing/HanddrawnMark";

export function ArticleContents({
  titles,
  label,
}: {
  titles: string[];
  label: string;
}) {
  const [active, setActive] = useState(0);
  useEffect(() => {
    const visible = new Set<number>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const index = Number(entry.target.id.replace("section-", ""));
          if (entry.isIntersecting) visible.add(index);
          else visible.delete(index);
        }
        if (visible.size) setActive(Math.min(...visible));
      },
      { rootMargin: "-90px 0px -48% 0px", threshold: 0 },
    );
    document
      .querySelectorAll(".prose > section[id]")
      .forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [titles]);
  return (
    <aside className="toc">
      <span className="toc-heading">
        <CoastGlyph kind="tide" />
        {label}
      </span>
      <nav aria-label={label}>
        {titles.map((title, index) => (
          <Anchor
            href={`#section-${index}`}
            key={title}
            aria-current={active === index ? "location" : undefined}
            onClick={() => setActive(index)}
          >
            <small>{String(index + 1).padStart(2, "0")}</small>
            <span>{title}</span>
            {active === index && <HanddrawnMark className="toc-mark" />}
          </Anchor>
        ))}
      </nav>
    </aside>
  );
}
