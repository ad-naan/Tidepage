"use client";
import { RoomHeading } from "@/components/RoomHeading";
import styles from "@/components/rooms.module.css";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { motion } from "motion/react";
import { ArrowUpRight, Sparkles } from "lucide-react";
import type { Project } from "../domain/models";
import { MiniSketch } from "@/components/Sketch";
import { Dialog } from "@/shared/ui/primitives";
import { softSpring } from "@/shared/lib/motion";

export function ProjectsView({ projects }: { projects: Project[] }) {
  const t = useTranslations("projects");
  const [category, setCategory] = useState("all");
  const [selected, setSelected] = useState<Project | null>(null);
  return (
    <div className={`inner-page ${styles.projects}`}>
      <RoomHeading
        room="projects"
        title={t("title")}
        description={t("description")}
      />
      <div className="tabs project-tabs">
        {(["all", "product", "open-source", "experiment"] as const).map((c) => (
          <button
            className={c === category ? "selected" : ""}
            key={c}
            onClick={() => setCategory(c)}
            aria-pressed={c === category}
          >
            {t(c)}
            {c === category && (
              <motion.span layoutId="project-tab" className="tab-underline" />
            )}
          </button>
        ))}
      </div>
      <div className="project-grid">
        {projects
          .filter((p) => category === "all" || p.category === category)
          .map((p) => (
            <motion.button
              key={p.id}
              className="project-card"
              onClick={() => setSelected(p)}
              whileHover={{ y: -6 }}
              whileTap={{ scale: 0.98 }}
              transition={softSpring}
            >
              <div className={`project-cover ${p.color}`}>
                <span className="project-status">
                  <span />
                  {p.status}
                </span>
                <MiniSketch kind={p.sketch} />
                <span className="project-cover-label">{p.name}</span>
                <span className="project-cover-caption">{p.subtitle}</span>
                <span className="project-arrow">
                  <ArrowUpRight size={22} />
                </span>
              </div>
              <div className="project-info">
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
            </motion.button>
          ))}
      </div>
      <div className="work-in-progress">
        <Sparkles size={21} />
        <div>
          <h3>{t("next")}</h3>
          <p>{t("progress")}</p>
        </div>
      </div>
      {selected && (
        <Dialog title={selected.name} onClose={() => setSelected(null)}>
          <div className="project-detail">
            <div className={`project-detail-art ${selected.color}`}>
              <MiniSketch kind={selected.sketch} />
            </div>
            <span className="eyebrow">{selected.status}</span>
            <h2>{selected.subtitle}</h2>
            <p>{selected.description}</p>
            <div className="tags">
              {selected.stack.map((s) => (
                <span key={s}>{s}</span>
              ))}
            </div>
            {selected.id === "spring" ? (
              <div className="spring-demo">
                <motion.div
                  className="spring-ball"
                  drag
                  dragSnapToOrigin
                  dragConstraints={{
                    top: -40,
                    bottom: 40,
                    left: -90,
                    right: 90,
                  }}
                  whileDrag={{ scale: 1.15 }}
                  transition={softSpring}
                  aria-hidden="true"
                >
                  ✳
                </motion.div>
                <p>{t("drag")}</p>
              </div>
            ) : (
              <p className="demo-disclaimer">{t("demo")}</p>
            )}
          </div>
        </Dialog>
      )}
    </div>
  );
}
