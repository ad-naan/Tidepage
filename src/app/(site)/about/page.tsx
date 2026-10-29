import { pageMetadata } from "@/server/seo/metadata";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PageHeading } from "@/shared/ui/primitives";
import { MiniSketch } from "@/components/Sketch";
import { profile } from "@/shared/config/profile";

export const metadata = pageMetadata(
  "/about",
  "我的自述",
  "关于 adnaan，以及这份仍在更新的光阴副本。",
);
export default function Page() {
  return (
    <div className="inner-page memoir-page">
      <PageHeading
        title="我的自述"
        description="关于我，也关于这份仍在更新的光阴副本。"
      />
      <div className="memoir-byline">
        <span className="memoir-avatar">a</span>
        <div>
          <strong>{profile.name}</strong>
          <span>写给来到这里的你</span>
        </div>
        <span className="memoir-status">
          <span className="live-dot" />
          这一页，还在继续
        </span>
      </div>
      <div className="memoir-layout">
        <article className="memoir-text">
          {profile.about.map((section, i) => (
            <section id={`memoir-${i}`} key={section.title}>
              <h2>{section.title}</h2>
              {section.paragraphs.map((p) => (
                <p key={p}>{p}</p>
              ))}
            </section>
          ))}
          <div className="memoir-signature">
            <p>把这一页留好，下一页继续。</p>
            <span>adnaan</span>
          </div>
        </article>
        <aside className="memoir-margin">
          <span className="memoir-margin-label">关于这份副本</span>
          <a href="#memoir-0">记录正在发生的生活</a>
          <a href="#memoir-1">把想法做出来</a>
          <a href="#memoir-2">与过去好好相处</a>
          <a href="#memoir-3">留下彼此的回声</a>
          <MiniSketch kind="tree" />
          <p>
            让记忆有处安放，
            <br />
            让明天仍有期待。
          </p>
        </aside>
      </div>
      <div className="memoir-next">
        <div>
          <span>故事没有写完</span>
          <p>最近的想法，放在手记里。</p>
        </div>
        <Link href="/notes">
          去读下一页 <ArrowRight size={17} />
        </Link>
      </div>
    </div>
  );
}
