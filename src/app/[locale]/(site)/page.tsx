import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/shared/i18n/navigation";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { MiniSketch } from "@/components/Sketch";
import { HomeHero } from "@/components/HomeHero";
import { Journey } from "@/components/Journey";
import { ArticleList } from "@/modules/content/ui/ArticleList";
import { getArticles, getNotes } from "@/modules/content/server";
import { getPageMetadata } from "@/server/seo/metadata";
export const generateMetadata = () => getPageMetadata("/");
import styles from "./home.module.css";

export default async function Home() {
  const locale = await getLocale();
  const t = await getTranslations("home");
  const [articles, notes] = await Promise.all([
    getArticles(locale),
    getNotes(locale),
  ]);
  return (
    <div className={styles.home}>
      <HomeHero />
      <section className="home-middle">
        <Journey />
        <div className="latest">
          <div className="section-heading">
            <h2>
              <span className="orange-dot" />
              {t("latest")}
            </h2>
            <Link href="/articles">
              {t("all")} <ArrowRight size={16} />
            </Link>
          </div>
          <ArticleList items={articles.slice(0, 5)} lead />
          <div className="writing-footnote">
            {t("footnote")}
            <span>↳ {t("count", { count: articles.length })}</span>
          </div>
        </div>
      </section>
      <section className="home-bottom">
        {notes[0] && (
          <Link href="/notes" className="note-preview">
            <div className="section-kicker">
              <span />
              {t("note")}
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
            <p>{t("quote")}</p>
            <span>
              {t("next")} <ArrowRight size={14} />
            </span>
          </div>
          <MiniSketch kind="boat" />
        </Link>
      </section>
    </div>
  );
}
