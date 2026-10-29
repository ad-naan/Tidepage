"use client";
import { motion, useReducedMotion } from "motion/react";
import { Code2, Coffee, Headphones, Terminal } from "lucide-react";
import { spring } from "@/shared/lib/motion";
export function ActivityDetails() {
  const reduce = useReducedMotion();
  return (
    <div className="activity-details">
      <div className="activity-now">
        <div className="current-activity">
          <span className="app-icon">
            <Code2 size={25} />
          </span>
          <div>
            <strong>Visual Studio Code</strong>
            <p>正在打磨博客里的小细节</p>
          </div>
        </div>
        <div className="focus-duration">
          <span>
            已经专注 <strong>42 分钟</strong>
          </span>
          <span className="focus-dots">
            {Array.from({ length: 8 }, (_, i) => (
              <motion.i
                key={i}
                initial={{ scaleY: 0.2, opacity: 0 }}
                animate={{ scaleY: 1, opacity: i > 5 ? 0.25 : 1 }}
                transition={{ ...spring, delay: reduce ? 0 : 0.06 + i * 0.035 }}
              />
            ))}
          </span>
        </div>
        <p className="activity-now-caption">
          <span className="live-dot" />
          正在创造，也在慢慢打磨。
        </p>
      </div>
      <div className="activity-history">
        {[
          { icon: Terminal, title: "调试一个小交互", time: "14:20" },
          { icon: Headphones, title: "听《海边的空白》", time: "13:45" },
          { icon: Coffee, title: "离开屏幕，喝杯咖啡", time: "13:10" },
        ].map((item, i) => (
          <motion.div
            key={item.time}
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ ...spring, delay: reduce ? 0 : 0.08 + i * 0.045 }}
          >
            <item.icon size={14} />
            <span>{item.title}</span>
            <time>{item.time}</time>
          </motion.div>
        ))}
      </div>
      <div className="presence-note">
        活动流样式演示<span>尚未连接监控</span>
      </div>
    </div>
  );
}
