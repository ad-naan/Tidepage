"use client";
import { motion } from "motion/react";
import { ArrowUpRight, Users } from "lucide-react";
import { AnimatedNumber } from "./AnimatedNumber";
import { spring } from "@/shared/lib/motion";
export function HeaderStatsTrigger({
  open,
  onClick,
}: {
  open: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      className={`header-visitors-trigger ${open ? "selected" : ""}`}
      onClick={onClick}
      aria-label="查看站点访客统计"
      aria-expanded={open}
      aria-controls="header-panel"
      whileHover="hover"
      initial="rest"
      animate="rest"
      whileTap={{ scale: 0.96 }}
    >
      <span className="header-visitor-faces" aria-hidden="true">
        {["山", "木", "云"].map((c, i) => (
          <motion.i
            key={c}
            variants={{
              rest: { x: 0, y: 0 },
              hover: { x: (i - 1) * 2, y: i === 1 ? -3 : -1 },
            }}
            transition={spring}
          >
            {c}
          </motion.i>
        ))}
      </span>
      <Users className="header-visitors-icon" size={16} />
      <span>
        <strong>8</strong> 位在读
      </span>
      <i className="live-dot" />
    </motion.button>
  );
}
export function HeaderStatsPanel() {
  return (
    <div className="header-stats-panel">
      <div className="header-stats-intro">
        <span className="live-dot" />
        <p>
          此刻，有 <strong>8 位朋友</strong> 和你一起翻开这一页。
        </p>
      </div>
      <div className="header-stats-metrics">
        {[
          { value: 126, label: "今日相遇" },
          { value: 12486, label: "累计浏览" },
          { value: 3208, label: "到访的朋友" },
        ].map((item) => (
          <div key={item.label}>
            <span>{item.label}</span>
            <strong>
              <AnimatedNumber value={item.value} />
              {item.label === "今日相遇" && <ArrowUpRight size={17} />}
            </strong>
          </div>
        ))}
      </div>
      <div className="header-visits-chart">
        <div>
          <span>最近七天</span>
          <span>每一次驻足，都留下了回声。</span>
        </div>
        <svg
          viewBox="0 0 600 78"
          fill="none"
          preserveAspectRatio="none"
          role="img"
          aria-label="最近七日访问趋势演示"
        >
          <path
            d="M0 67C25 67 30 47 60 51S110 69 140 42 180 50 220 34 260 55 300 28 360 40 400 20 450 40 490 14 550 24 600 8V78H0Z"
            fill="var(--accent)"
            opacity=".055"
          />
          <motion.path
            d="M0 67C25 67 30 47 60 51S110 69 140 42 180 50 220 34 260 55 300 28 360 40 400 20 450 40 490 14 550 24 600 8"
            stroke="var(--accent)"
            strokeWidth="1.6"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </svg>
      </div>
      <div className="presence-note">
        谢谢你，成为这份光阴的一部分。<span>统计样式 · 演示数据</span>
      </div>
    </div>
  );
}
