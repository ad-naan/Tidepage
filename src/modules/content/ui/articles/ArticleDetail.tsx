import { DateTime } from "@/shared/ui/typography/DateTime";
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
import { ReadingImage } from "@/modules/content/ui/rich-text/ReadingImage";
import { documentChapters } from "@/modules/content/domain/document-presentation";
import {
  Discussion,
  ReadingQuoteSelection,
} from "@/modules/engagement/ui/Discussion";
import type { Article, ArticleSummary } from "@/modules/content/domain/models";
import styles from "./ArticleDetail.module.css";
import { AuthorSignature } from "@/modules/identity/ui/AuthorSignature";
import { EngagementProvider } from "@/modules/engagement/ui/EngagementProvider";
import { getReadingImageDimensions } from "@/modules/content/server/reading-image-dimensions";
export async function ArticleDetail({
  article,
  next,
}: {
  article: Article;
  next?: Pick<ArticleSummary, "slug" | "title">;
}) {
  const body = articleDocument(article);
  const cover = article.publication?.cover;
  const [t, categories, imageDimensions] = await Promise.all([
    getTranslations("articles"),
    getTranslations("categories"),
    getReadingImageDimensions([body], cover ? [cover.assetId] : []),
  ]);
  return (
    <div className={`reading-page ${styles.reading}`}>
      <ReadingQuoteSelection />
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
          <AuthorSignature
            size="inline"
            name={article.publication?.author || undefined}
          />
          <span>·</span>
          <DateTime value={article.date} />
          <span>·</span>
          <Clock size={13} />
          <span>{t("minutes", { count: article.minutes })}</span>
        </div>
        <p className="reading-excerpt">{article.excerpt}</p>
        <CoastalVignette kind={article.sketch} />
        <PencilLine className="reading-header-shore" />
      </header>
      {cover && (
        <ReadingImage
          src={cover.assetId}
          alt={cover.alt}
          dimensions={imageDimensions[cover.assetId]}
          priority
        />
      )}
      <EngagementProvider targets={[{ type: "article", id: article.slug }]}>
        <div className="reading-layout">
          <ArticleContents
            titles={documentChapters(body).flatMap((chapter) =>
              chapter.title ? [chapter.title] : [],
            )}
            label={t("toc")}
            slug={article.slug}
            title={article.title}
          />
          <div className="prose">
            <RichText
              document={body}
              chapters
              imageDimensions={imageDimensions}
            />
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
