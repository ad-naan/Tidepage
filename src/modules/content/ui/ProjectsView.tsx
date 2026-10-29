"use client";
import { useState } from "react";
import { motion } from "motion/react";
import { ArrowUpRight, Sparkles } from "lucide-react";
import type { Project } from "../domain/models";
import { MiniSketch } from "@/components/Sketch";
import { Dialog, PageHeading } from "@/shared/ui/primitives";
import { softSpring } from "@/shared/lib/motion";

export function ProjectsView({ projects }: { projects: Project[] }) {
  const [category, setCategory] = useState("全部");
  const [selected, setSelected] = useState<Project | null>(null);
  return (
    <div className="inner-page">
      <PageHeading
        title="把想法写进现实"
        description="把每一次动手，都当作新的起点。这些作品记录了我走过的路。"
      />
      <div className="tabs project-tabs">
        {["全部", "产品", "开源", "实验"].map((c) => (
          <button
            className={c === category ? "selected" : ""}
            key={c}
            onClick={() => setCategory(c)}
            aria-pressed={c === category}
          >
            {c}
            {c === category && (
              <motion.span layoutId="project-tab" className="tab-underline" />
            )}
          </button>
        ))}
      </div>
      <div className="project-grid">
        {projects
          .filter((p) => category === "全部" || p.category === category)
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
                  <small>{p.category}</small>
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
          <h3>下一页，仍在尝试。</h3>
          <p>完成一段，再开始一段。新的想法会继续留在这里。</p>
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
                <p>拖动这颗小太阳，再轻轻松手。</p>
              </div>
            ) : (
              <p className="demo-disclaimer">
                这是博客的示例项目展示，暂未提供真实应用或源码链接。替换内容配置即可展示你的作品。
              </p>
            )}
          </div>
        </Dialog>
      )}
    </div>
  );
}
