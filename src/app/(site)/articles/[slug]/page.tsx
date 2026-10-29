import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Clock } from "lucide-react";
import { getArticles, getArticle } from "@/modules/content/server";
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
  if (!slugSchema.safeParse(slug).success) notFound();
  const article = await getArticle(slug);
  if (!article) notFound();
  return articleMetadata(article);
}
export default async function ArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!slugSchema.safeParse(slug).success) notFound();
  const [article, articles] = await Promise.all([
    getArticle(slug),
    getArticles(),
  ]);
  if (!article) notFound();
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
        回到文章
      </Link>
      <header className="reading-header">
        <div className="eyebrow">{article.category}</div>
        <h1>{article.title}</h1>
        <div className="reading-meta">
          <span>adnaan</span>
          <span>·</span>
          <time dateTime={article.date}>
            {article.date.replaceAll("-", ".")}
          </time>
          <span>·</span>
          <Clock size={13} />
          <span>{article.minutes} 分钟阅读</span>
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
          <p className="content-note">本文为博客示例内容，用于展示阅读体验。</p>
        </div>
        <aside className="toc">
          <span>这篇文章里</span>
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
            下一篇，接着逛逛<strong>{next.title}</strong>
          </span>
          <ArrowRight size={23} />
        </Link>
      )}
    </div>
  );
}
