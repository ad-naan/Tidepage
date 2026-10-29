import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/shared/i18n/navigation";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Clock } from "lucide-react";
import { getArticles, getArticle, getArticleLocales } from "@/modules/content/server";
import { articleMetadata } from "@/server/seo/metadata";
import { articleGraph } from "@/server/seo/structured-data";
import { JsonLd } from "@/server/seo/JsonLd";
import { slugSchema } from "@/modules/content/domain/models";
import { MiniSketch } from "@/components/Sketch";
import { ArticleActions } from "@/modules/content/ui/ArticleActions";
import {
  Discussion,
  ReadingAnnotations,
  RichArticleDetails,
} from "@/modules/engagement/ui/Discussion";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const locale = await getLocale();
  if (!slugSchema.safeParse(slug).success) notFound();
  const article = await getArticle(slug, locale);
  if (!article) notFound();
  return articleMetadata(article, await getArticleLocales(slug));
}
export default async function ArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const locale = await getLocale();
  if (!slugSchema.safeParse(slug).success) notFound();
  const [article, articles] = await Promise.all([
    getArticle(slug, locale),
    getArticles(locale),
  ]);
  if (!article) notFound();
  const t=await getTranslations("articles");
  const categories=await getTranslations("categories");
  const next =
    articles[
      (articles.findIndex((a) => a.slug === article.slug) + 1) % articles.length
    ];
  return (
    <div className="reading-page">
      <JsonLd data={articleGraph(article)} />
      <ReadingAnnotations />
      <Link href="/articles" className="back-link">
        <ArrowLeft size={16} />
        {t("back")}
      </Link>
      <header className="reading-header">
        <div className="eyebrow">{categories(article.category)}</div>
        <h1>{article.title}</h1>
        <div className="reading-meta">
          <span>adnaan</span>
          <span>·</span>
          <time dateTime={article.date}>
            {article.date.replaceAll("-", ".")}
          </time>
          <span>·</span>
          <Clock size={13} />
          <span>{t("minutes", {count:article.minutes})}</span>
        </div>
        <p className="reading-excerpt">{article.excerpt}</p>
        <MiniSketch kind={article.sketch} />
      </header>
      <div className="reading-layout">
        <div className="prose">
          {article.sections.map((s, i) => (
            <section key={s.title} id={`section-${i}`}>
              <h2>{s.title}</h2>
              {s.paragraphs.map((p) => (
                <p key={p}>{p}</p>
              ))}
            </section>
          ))}
          <RichArticleDetails />
          <div className="article-end">✳</div>
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
          <p className="content-note">{t("demo")}</p>
        </div>
        <aside className="toc">
          <span>{t("toc")}</span>
          {article.sections.map((s, i) => (
            <a href={`#section-${i}`} key={s.title}>
              {String(i + 1).padStart(2, "0")} {s.title}
            </a>
          ))}
        </aside>
      </div>
      <Discussion />
      {next && (
        <Link href={`/articles/${next.slug}`} className="next-article">
          <span>
            {t("continue")}<strong>{next.title}</strong>
          </span>
          <ArrowRight size={23} />
        </Link>
      )}
    </div>
  );
}
