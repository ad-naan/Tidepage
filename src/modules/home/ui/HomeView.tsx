import { getTranslations } from "next-intl/server";
import { Link } from "@/shared/i18n/navigation";
import { ArrowRight } from "lucide-react";
import { SketchLabel } from "@/shared/ui/drawing/CoastalMarks";
import { CoastalVignette } from "@/shared/ui/illustration/CoastalVignette";
import { HomeHero } from "@/modules/home/ui/HomeHero";
import { HomeNotes } from "./HomeNotes";
import { ArticleList } from "@/modules/content/ui/articles/ArticleList";
import styles from "./HomeView.module.css";
import type { HomeCopy } from "@/modules/site-settings/domain/identity";
import type {
  ArticleSummary,
  NoteListEntry,
  Quote,
} from "@/modules/content/domain/models";

export async function HomeView({
  articles,
  total,
  notes,
  quote,
  homeCopy,
}: {
  articles: ArticleSummary[];
  total: number;
  notes: NoteListEntry[];
  quote: Pick<Quote, "text"> | null;
  homeCopy: HomeCopy;
}) {
  const t = await getTranslations("home");
  return (
    <div className={styles.home}>
      <HomeHero copy={homeCopy} />
      <section className="home-middle">
        <div className={styles.sidebar}>
          <HomeNotes notes={notes} />
          {quote && (
            <Link href="/quotes" className={styles.quote}>
              <span className={styles.quoteMark} aria-hidden="true">
                “
              </span>
              <div>
                <p>{quote.text}</p>
                <span className={styles.quoteLink}>
                  {t("next")} <ArrowRight size={14} aria-hidden="true" />
                </span>
              </div>
              <CoastalVignette kind="boat" className={styles.quoteSketch} />
            </Link>
          )}
        </div>
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
    </div>
  );
}
