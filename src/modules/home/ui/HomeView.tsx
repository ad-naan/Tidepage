import { getTranslations } from "next-intl/server";
import { Link } from "@/shared/i18n/navigation";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { PencilLine, SketchLabel } from "@/shared/ui/drawing/CoastalMarks";
import { CoastalVignette } from "@/shared/ui/illustration/CoastalVignette";
import { HomeHero } from "@/modules/home/ui/HomeHero";
import { Journey } from "@/modules/home/ui/Journey";
import { ArticleList } from "@/modules/content/ui/articles/ArticleList";
import styles from "./HomeView.module.css";
import type { HomeCopy } from "@/modules/site-settings/domain/identity";
import type {
  ArticleSummary,
  NotePreview,
  Quote,
} from "@/modules/content/domain/models";

export async function HomeView({
  articles,
  total,
  note,
  quote,
  homeCopy,
}: {
  articles: ArticleSummary[];
  total: number;
  note: NotePreview | null;
  quote: Pick<Quote, "text"> | null;
  homeCopy: HomeCopy;
}) {
  const t = await getTranslations("home");
  return (
    <div className={styles.home}>
      <HomeHero copy={homeCopy} />
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
          <ArticleList items={articles} lead />
          {!articles.length && (
            <p className="empty-state">{t("emptyArticles")}</p>
          )}
          <div className="writing-footnote">
            {t("footnote")}
            <span>↳ {t("count", { count: total })}</span>
          </div>
        </div>
      </section>
      <section className="home-bottom">
        <PencilLine className="home-bottom-shore" />
        {note && (
          <Link href="/notes" className="note-preview">
            <div className="note-preview-heading">
              <SketchLabel kind="leaf">{t("note")}</SketchLabel>
              <ArrowUpRight size={16} />
            </div>
            <p>{note.text}</p>
            <span className="muted">
              {note.date} · {note.tag}
            </span>
          </Link>
        )}
        {quote && (
          <Link href="/quotes" className="quote-preview">
            <PencilLine kind="trail" className="quote-preview-fold" />
            <span className="quote-mark">“</span>
            <div>
              <p>{quote.text}</p>
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
