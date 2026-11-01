import { getLocale, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import {
  getArticles,
  getArticle,
  getArticleLocales,
} from "@/modules/content/server";
import { slugSchema } from "@/modules/content/domain/models";
import { ArticleDetail } from "@/modules/content/ui/articles/ArticleDetail";
import { articleMetadata } from "@/server/seo/metadata";
import { articleGraph } from "@/server/seo/structured-data";
import { JsonLd } from "@/server/seo/JsonLd";
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
  const categories = await getTranslations("categories");
  const nav = await getTranslations("nav");
  const next =
    articles[
      (articles.findIndex((item) => item.slug === article.slug) + 1) %
        articles.length
    ];
  return (
    <>
      <JsonLd
        data={articleGraph(article, {
          home: nav("home"),
          articles: nav("articles"),
          category: categories(article.category),
        })}
      />
      <ArticleDetail article={article} next={next} />
    </>
  );
}
