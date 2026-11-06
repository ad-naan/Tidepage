import { getTranslations } from "next-intl/server";
import { Link } from "@/shared/i18n/navigation";
import {
  PencilLine,
  CoastGlyph,
  SketchLabel,
} from "@/shared/ui/drawing/CoastalMarks";
import { CoastalVignette } from "@/shared/ui/illustration/CoastalVignette";
import { ArrowLeft, ArrowRight, Clock } from "lucide-react";
import { ArticleContents } from "./ArticleContents";
import { ArticleActions } from "./ArticleActions";
import { articleDocument } from "@/modules/content/domain/legacy-draft";
import { RichText } from "@/modules/content/ui/rich-text/RichText";
import { documentChapters } from "@/modules/content/domain/document-presentation";
import {
  Discussion,
  ReadingAnnotations,
} from "@/modules/engagement/ui/Discussion";
import type { Article, ArticleSummary } from "@/modules/content/domain/models";
import styles from "./ArticleDetail.module.css";
import { AuthorSignature } from "@/modules/identity/ui/AuthorSignature";
import { EngagementProvider } from "@/modules/engagement/ui/EngagementProvider";
export async function ArticleDetail({
  article,
  next,
}: {
  article: Article;
  next?: ArticleSummary;
}) {
  const body = articleDocument(article);
  const t = await getTranslations("articles");
  const categories = await getTranslations("categories");
  return (
    <div className={`reading-page ${styles.reading}`}>
      <ReadingAnnotations />
      <Link href="/articles" className="back-link">
        <ArrowLeft size={16} />
        {t("back")}
      </Link>
      <header className="reading-header">
        <SketchLabel kind="shell" className="eyebrow">
          {categories(article.category)}
        </SketchLabel>
        <h1>{article.title}</h1>
        <div className="reading-meta">
          <AuthorSignature size="inline" />
          <span>·</span>
          <time dateTime={article.date}>
            {article.date.replaceAll("-", ".")}
          </time>
          <span>·</span>
          <Clock size={13} />
          <span>{t("minutes", { count: article.minutes })}</span>
        </div>
        <p className="reading-excerpt">{article.excerpt}</p>
        <CoastalVignette kind={article.sketch} />
        <PencilLine className="reading-header-shore" />
      </header>
      <EngagementProvider targets={[{ type: "article", id: article.slug }]}>
        <div className="reading-layout">
          <div className="prose">
            <RichText document={body} chapters />
            <div className="article-end">
              <CoastGlyph kind="shell" />
            </div>
            <div className="tags">
              {article.tags.map((t) => (
                <Link
                  key={t}
                  href={`/articles?category=${encodeURIComponent(article.category)}`}
                >
                  #{t}
                </Link>
              ))}
            </div>
            <ArticleActions slug={article.slug} title={article.title} />
          </div>
          <ArticleContents
            titles={documentChapters(body).flatMap((chapter) =>
              chapter.title ? [chapter.title] : [],
            )}
            label={t("toc")}
            slug={article.slug}
            title={article.title}
          />
        </div>
      </EngagementProvider>
      <div id="article-comments" className={styles.comments}>
        <Discussion target={{ type: "article", id: article.slug }} />
      </div>
      {next && (
        <Link href={`/articles/${next.slug}`} className="next-article">
          <PencilLine className="next-shore" />
          <span>
            {t("continue")}
            <strong>{next.title}</strong>
          </span>
          <ArrowRight size={23} />
        </Link>
      )}
    </div>
  );
}
