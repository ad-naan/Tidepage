"use client";
import { ProgressiveList } from "@/shared/ui/loading/ProgressiveList";
import { Button } from "@/shared/ui/button/Button";
import { FilterTabs } from "@/shared/ui/filter-tabs/FilterTabs";
import {
  PencilFrame,
  PencilLine,
  CoastGlyph,
  SketchLabel,
} from "@/shared/ui/drawing/CoastalMarks";
import { ContentHeading } from "@/modules/content/ui/layout/ContentHeading";
import styles from "./ProjectsView.module.css";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { listItemMotion } from "@/shared/lib/motion";
import { ArrowUpRight } from "lucide-react";
import type { Project } from "@/modules/content/domain/models";
import { CoastalVignette } from "@/shared/ui/illustration/CoastalVignette";
import { Dialog } from "@/shared/ui/dialog/Dialog";
import { RichText } from "@/modules/content/ui/rich-text/RichText";
import { Discussion } from "@/modules/engagement/ui/Discussion";
import { ContentEngagementActions } from "@/modules/engagement/ui/EngagementActions";

export function ProjectsView({ projects }: { projects: Project[] }) {
  const reduced = useReducedMotion();
  const t = useTranslations("projects");
  const [category, setCategory] = useState("all");
  const [selected, setSelected] = useState<Project | null>(null);
  const visible = projects.filter(
    (p) => category === "all" || p.category === category,
  );
  const order = new Map(projects.map(({ id }, index) => [id, index + 1]));
  const categories = ["all", "product", "open-source", "experiment"] as const;
  return (
    <div className={`inner-page ${styles.projects}`}>
      <ContentHeading
        room="projects"
        title={t("title")}
        description={t("description")}
      />
      <div className={styles.toolbar}>
        <FilterTabs
          value={category}
          options={categories.map((value) => ({
            value,
            label: t(value),
            count: projects.filter(
              (p) => value === "all" || p.category === value,
            ).length,
          }))}
          label={t("filterLabel")}
          onChange={setCategory}
        />
      </div>
      <ProgressiveList
        key={category}
        items={visible}
        className={styles.index}
        as="ul"
      >
        {(p, index) => (
          <motion.li
            key={p.id}
            {...listItemMotion(index, reduced)}
            className={styles.entry}
            data-lead={index === 0 && category === "all"}
          >
            <span className={styles.number} aria-hidden="true">
              {String(order.get(p.id)).padStart(2, "0")}
            </span>
            <div className={styles.copy}>
              <p className={styles.meta}>
                {p.category === "product" ||
                p.category === "open-source" ||
                p.category === "experiment"
                  ? t(p.category)
                  : p.category}
                {p.status && <SketchLabel kind="wind">{p.status}</SketchLabel>}
              </p>
              <h2>
                <Button
                  className={styles.open}
                  onClick={() => setSelected(p)}
                  aria-haspopup="dialog"
                  pressEffect={false}
                >
                  {p.name}
                  <ArrowUpRight size={18} aria-hidden="true" />
                </Button>
              </h2>
              {p.subtitle && !p.stack.includes(p.subtitle) && (
                <p className={styles.subtitle}>{p.subtitle}</p>
              )}
              <p className={styles.description}>{p.description}</p>
              {!!p.stack.length && (
                <ul className={styles.stack}>
                  {[...new Set(p.stack)].map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
              )}
            </div>
            <div className={styles.folio}>
              <div
                className={styles.sketch}
                data-tint={p.color}
                aria-hidden="true"
              >
                <PencilFrame kind="ticket" />
                <CoastalVignette kind={p.sketch} />
                <PencilLine kind="trail" />
              </div>
            </div>
            <PencilLine kind="fold" className={styles.projectShore} />
          </motion.li>
        )}
      </ProgressiveList>
      {!visible.length && <p className={styles.empty}>{t("empty")}</p>}
      <aside className={styles.signoff}>
        <CoastGlyph kind="leaf" />
        <div>
          <h2>{t("next")}</h2>
          <p>{t("progress")}</p>
        </div>
      </aside>
      {selected && (
        <Dialog title={selected.name} wide onClose={() => setSelected(null)}>
          <div className={styles.detail}>
            <p className={styles.meta}>{selected.status}</p>
            <h2>{selected.name}</h2>
            {selected.subtitle && (
              <p className={styles.subtitle}>{selected.subtitle}</p>
            )}
            <p>{selected.description}</p>
            {selected.body && <RichText document={selected.body} />}
            <ul className={styles.stack}>
              {[...new Set(selected.stack)].map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </div>
          <ContentEngagementActions
            target={{ type: "project", id: selected.id }}
          />
          <Discussion target={{ type: "project", id: selected.id }} />
        </Dialog>
      )}
    </div>
  );
}
