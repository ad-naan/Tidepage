"use client";
import { Button } from "@/shared/ui/button/Button";
import { FilterTabs } from "@/shared/ui/filter-tabs/FilterTabs";
import {
  PencilFrame,
  PencilLine,
  SketchLabel,
  CoastGlyph,
} from "@/shared/ui/drawing/CoastalMarks";
import { ContentHeading } from "@/modules/content/ui/layout/ContentHeading";
import styles from "./ProjectsView.module.css";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { softSpring } from "@/shared/lib/motion";
import { ArrowUpRight } from "lucide-react";
import type { Project } from "@/modules/content/domain/models";
import { CoastalVignette } from "@/shared/ui/illustration/CoastalVignette";
import { Dialog } from "@/shared/ui/dialog/Dialog";
import { RichText } from "@/modules/content/ui/rich-text/RichText";
import { Discussion } from "@/modules/engagement/ui/Discussion";

export function ProjectsView({ projects }: { projects: Project[] }) {
  const t = useTranslations("projects");
  const [category, setCategory] = useState("all");
  const [selected, setSelected] = useState<Project | null>(null);
  return (
    <div className={`inner-page ${styles.projects}`}>
      <ContentHeading
        room="projects"
        title={t("title")}
        description={t("description")}
      />
      <div className="room-toolbar">
        <FilterTabs
          value={category}
          options={(
            ["all", "product", "open-source", "experiment"] as const
          ).map((value) => ({
            value,
            label: t(value),
            count: projects.filter(
              (p) => value === "all" || p.category === value,
            ).length,
          }))}
          label={t("filterLabel")}
          onChange={setCategory}
        />
        <PencilLine className="toolbar-shore" />
      </div>
      <div className="project-grid">
        {projects
          .filter((p) => category === "all" || p.category === category)
          .map((p) => (
            <Button
              key={p.id}
              className="project-card"
              onClick={() => setSelected(p)}
              whileHover={{ y: -3 }}
              whileTap={{ scale: 0.98 }}
              transition={softSpring}
            >
              <PencilFrame kind="ticket" />
              <div className={`project-cover ${p.color}`}>
                <SketchLabel className="project-status" kind="wind">
                  {p.status}
                </SketchLabel>
                <CoastalVignette kind={p.sketch} />
                <span className="project-cover-label">{p.name}</span>
                <span className="project-cover-caption">{p.subtitle}</span>
                <span className="project-arrow">
                  <ArrowUpRight size={22} />
                </span>
              </div>
              <div className="project-info">
                <PencilLine kind="fold" className="project-fold" />
                <h2>
                  {p.name}
                  <small>
                    {p.category === "product" ||
                    p.category === "open-source" ||
                    p.category === "experiment"
                      ? t(p.category)
                      : p.category}
                  </small>
                </h2>
                <p>{p.description}</p>
                <div className="tags">
                  {p.stack.map((s) => (
                    <span key={s}>{s}</span>
                  ))}
                </div>
              </div>
            </Button>
          ))}
        <aside className="work-in-progress">
          <CoastGlyph kind="leaf" />
          <div>
            <h3>{t("next")}</h3>
            <p>{t("progress")}</p>
          </div>
        </aside>
      </div>
      {selected && (
        <Dialog title={selected.name} onClose={() => setSelected(null)}>
          <div className="project-detail">
            <div className={`project-detail-art ${selected.color}`}>
              <CoastalVignette kind={selected.sketch} />
            </div>
            <span className="eyebrow">{selected.status}</span>
            <h2>{selected.subtitle}</h2>
            <p>{selected.description}</p>
            {selected.body && <RichText document={selected.body} />}
            <div className="tags">
              {selected.stack.map((s) => (
                <span key={s}>{s}</span>
              ))}
            </div>
          </div>
          <Discussion target={{ type: "project", id: selected.id }} />
        </Dialog>
      )}
    </div>
  );
}
