import { getTranslations } from "next-intl/server";
import { Link } from "@/shared/i18n/navigation";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { PencilLine, SketchLabel } from "@/shared/ui/drawing/CoastalMarks";
import { CoastalVignette } from "@/shared/ui/illustration/CoastalVignette";
import { HomeHero } from "@/modules/home/ui/HomeHero";
import { Journey } from "@/modules/home/ui/Journey";
import { ArticleList } from "@/modules/content/ui/articles/ArticleList";
import styles from "./HomeView.module.css";
import type {
  ArticleSummary,
  Note,
  Quote,
} from "@/modules/content/domain/models";

export async function HomeView({
  articles,
  notes,
  quotes,
}: {
  articles: ArticleSummary[];
  notes: Note[];
  quotes: Quote[];
}) {
  const t = await getTranslations("home");
  return (
    <div className={styles.home}>
      <HomeHero />
      <section className="home-middle">
        <Journey />
        <div className="latest">
          <div className="section-heading">
            <h2>
              <SketchLabel kind="shell">{t("latest")}</SketchLabel>
            </h2>
            <Link href="/articles">
              {t("all")} <ArrowRight size={16} />
            </Link>
          </div>
          <ArticleList items={articles.slice(0, 5)} lead />
          {!articles.length && (
            <p className="empty-state">{t("emptyArticles")}</p>
          )}
          <div className="writing-footnote">
            {t("footnote")}
            <span>↳ {t("count", { count: articles.length })}</span>
          </div>
        </div>
      </section>
      <section className="home-bottom">
        <PencilLine className="home-bottom-shore" />
        {notes[0] && (
          <Link href="/notes" className="note-preview">
            <div className="note-preview-heading">
              <SketchLabel kind="leaf">{t("note")}</SketchLabel>
              <ArrowUpRight size={16} />
            </div>
            <p>{notes[0].text}</p>
            <span className="muted">
              {notes[0].date} · {notes[0].tag}
            </span>
          </Link>
        )}
        {quotes[0] && (
          <Link href="/quotes" className="quote-preview">
            <PencilLine kind="trail" className="quote-preview-fold" />
            <span className="quote-mark">“</span>
            <div>
              <p>{quotes[0].text}</p>
              <span>
                {t("next")} <ArrowRight size={14} />
              </span>
            </div>
            <CoastalVignette kind="boat" />
          </Link>
        )}
      </section>
    </div>
  );
}
