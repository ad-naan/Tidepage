import { getLocale, getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { ArticleIndex } from "@/modules/content/ui/ArticleIndex";
import { listArticles } from "@/modules/content/server";
import { getPageMetadata } from "@/server/seo/metadata";
export const generateMetadata = () => getPageMetadata("/articles");
import { redirect } from "@/shared/i18n/navigation";
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
  if (!parsed.success) return redirect({href:"/articles",locale});
  const result = await listArticles({...parsed.data, locale});
  const t = await getTranslations("common");
  return (
    <Suspense fallback={<p className="loading" role="status">{t("loading")}</p>}>
      <ArticleIndex result={result} category={parsed.data.category} />
    </Suspense>
  );
}
