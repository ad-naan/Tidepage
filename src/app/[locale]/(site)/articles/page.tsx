import { getLocale, getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { ArticleIndex } from "@/modules/content/ui/ArticleIndex";
import { listArticles } from "@/modules/content/server";
import { getPageMetadata } from "@/server/seo/metadata";
export const generateMetadata = () => getPageMetadata("/articles");
import { redirect } from "next/navigation";
import { articleQuerySchema } from "@/modules/content/domain/query";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const locale = await getLocale();
  const input = await searchParams;
  const parsed = articleQuerySchema.safeParse({
    page: input.page,
    pageSize: 12,
    q: input.q,
    category: input.category,
  });
  if (!parsed.success) redirect("/articles");
  const result = await listArticles({...parsed.data, locale});
  return (
    <Suspense fallback={<p className="loading">正在翻开新的一页…</p>}>
      <ArticleIndex result={result} />
    </Suspense>
  );
}
