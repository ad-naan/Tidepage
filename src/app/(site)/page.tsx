import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { HeroSketch, MiniSketch } from "@/components/Sketch";
import { Journey } from "@/components/Journey";
import { ArticleList } from "@/modules/content/ui/ArticleList";
import { getArticles, getNotes } from "@/modules/content/server";
import { pageMetadata } from "@/server/seo/metadata";
export const metadata = pageMetadata("/");
import { profile } from "@/shared/config/profile";
import styles from "./home.module.css";

export default async function Home() {
  const [articles, notes] = await Promise.all([getArticles(), getNotes()]);
  return (
    <div className={styles.home}>
      <section className="hero">
        <div className="hero-copy">
          <div className="hero-greeting">
            {profile.greeting}
            <span>✳</span>
          </div>
          <h1>
            把光阴，
            <br />
            <span className="hand-title">
              写成自己的副本
              <svg viewBox="0 0 430 30" fill="none" aria-hidden="true">
                <path
                  d="M3 22Q167-9 424 10M111 27l49-22-17 16 57-16"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                />
              </svg>
            </span>
          </h1>
          <div className="hero-introduction" aria-label="自我介绍">
            <p>{profile.introduction}</p>
          </div>
          <Link className="explore-link" href="/articles">
            探索文章 <ArrowRight size={22} />
          </Link>
          <Link href="/explore" className={styles.coastEntry}>
            走进这片海岸 <ArrowUpRight size={16} />
            <span>空间漫游</span>
          </Link>
        </div>
        <HeroSketch quiet />
      </section>
      <section className="home-middle">
        <Journey />
        <div className="latest">
          <div className="section-heading">
            <h2>
              <span className="orange-dot" />
              最近写下的
            </h2>
            <Link href="/articles">
              翻阅全部 <ArrowRight size={16} />
            </Link>
          </div>
          <ArticleList items={articles.slice(0, 5)} lead />
          <div className="writing-footnote">
            写下这一页，继续往前走。
            <span>↳ {articles.length} 份光阴的记录</span>
          </div>
        </div>
      </section>
      <section className="home-bottom">
        {notes[0] && (
          <Link href="/notes" className="note-preview">
            <div className="section-kicker">
              <span />
              最近留下一页
              <ArrowUpRight size={16} />
            </div>
            <p>{notes[0].text}</p>
            <span className="muted">
              {notes[0].date} · {notes[0].tag}
            </span>
          </Link>
        )}
        <Link href="/quotes" className="quote-preview">
          <span className="quote-mark">“</span>
          <div>
            <p>让过去有处安放，让明天仍有期待。</p>
            <span>
              留给下一页 <ArrowRight size={14} />
            </span>
          </div>
          <MiniSketch kind="boat" />
        </Link>
      </section>
    </div>
  );
}
