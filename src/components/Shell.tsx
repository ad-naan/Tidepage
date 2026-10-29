"use client";
import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { Mail, Rss, X, Heart, ArrowRight } from "lucide-react";
import { useLocalState } from "@/shared/hooks/useLocalState";
import { Dialog } from "@/shared/ui/primitives";
import { spring } from "@/shared/lib/motion";
import { SiteHeader } from "./SiteHeader";
import { CelestialNav } from "./CelestialNav";

import type { ArticleSummary } from "@/modules/content/domain/models";

const nav = [
  { href: "/", label: "首页" },
  { href: "/articles", label: "文章" },
  { href: "/notes", label: "手记" },
  { href: "/projects", label: "项目" },
  { href: "/quotes", label: "一言" },
  { href: "/gallery", label: "照片廊" },
  { href: "/about", label: "自述" },
];
export function Shell({
  children,
  articles,
}: {
  children: ReactNode;
  articles: ArticleSummary[];
}) {
  const pathname = usePathname();
  const [theme, setTheme] = useLocalState<"light" | "dark">(
    "adnaan-theme",
    "light",
  );
  const [menu, setMenu] = useState(false);
  const [immersive, setImmersive] = useState(false);
  const [contact, setContact] = useState(false);
  const [secret, setSecret] = useState(false);
  const [visitedCoast, setVisitedCoast] = useState(false);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);
  useEffect(() => {
    setMenu(false);
    setImmersive(false);
    try { setVisitedCoast(sessionStorage.getItem("coast-visited") === "true"); } catch { /* Optional navigation hint. */ }
  }, [pathname]);
  return (
    <MotionConfig transition={spring} reducedMotion="user">
      <div className={`site-shell ${immersive ? "is-immersive" : ""}`}>
        <SiteHeader
          articles={articles}
          label={
            nav.find(
              (item) =>
                item.href ===
                (pathname.startsWith("/articles/") ? "/articles" : pathname),
            )?.label || "随便逛逛"
          }
          immersive={immersive}
          onImmersiveChange={() => setImmersive((v) => !v)}
          theme={theme}
          onThemeChange={() => setTheme(theme === "light" ? "dark" : "light")}
          menuOpen={menu}
          onMenuToggle={() => setMenu((v) => !v)}
        />
        <CelestialNav
          theme={theme}
          mobileOpen={menu}
          onNavigate={() => setMenu(false)}
          immersive={immersive}
        />{" "}
        {menu && (
          <button
            className="mobile-scrim"
            aria-label="关闭导航"
            onClick={() => setMenu(false)}
          />
        )}
        <div className="main-wrap">
          <main id="main-content">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={spring}
            >
              {children}
            </motion.div>
          </main>
          {visitedCoast && pathname !== "/" && (
            <Link href="/explore" className="return-to-coast">
              回到海岸 <ArrowRight size={14} />
            </Link>
          )}
          <footer className="page-footer">
            <div className="footer-identity">
              <span>© 2026 adnaan</span>
              <button aria-label="留下一份心意" onClick={() => setSecret(true)}>
                <Heart size={14} />
              </button>
              <Link href="/feed.xml" aria-label="订阅 RSS">
                <Rss size={14} />
              </Link>
              <button aria-label="联系与留言" onClick={() => setContact(true)}>
                <Mail size={14} />
              </button>
            </div>
            <span>
              内容与数据为演示 <span className="footer-star">✳</span>
            </span>
          </footer>
        </div>
        {contact && (
          <Dialog title="你好，很高兴遇见你" onClose={() => setContact(false)}>
            <div className="contact-card">
              <Mail size={32} />
              <h2>让好想法发生连接</h2>
              <p>
                这里为站主预留了联系入口。
                <br />
                配置真实邮箱后，就可以收到读者来信。
              </p>
              <Link
                href="/about"
                onClick={() => setContact(false)}
                className="button-outline"
              >
                读我的自述 <ArrowRight size={16} />
              </Link>
            </div>
          </Dialog>
        )}
        <AnimatePresence>
          {secret && (
            <motion.button
              className="secret-toast"
              onClick={() => setSecret(false)}
              initial={{ y: 80, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 80, opacity: 0 }}
            >
              这一页收到你的心意。愿下一页，也有人与你同行。
              <Heart size={17} fill="currentColor" />
              <X size={14} />
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </MotionConfig>
  );
}
