import { getLocale } from "next-intl/server";
import { ArticlesView } from "@/modules/content/ui/articles/ArticlesView";
import { listArticles, getContentTags } from "@/modules/content/server";
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
    tag: input.tag,
    category: input.category,
  });
  if (!parsed.success) return redirect({ href: "/articles", locale });
  const [result, tags] = await Promise.all([
    listArticles({ ...parsed.data, locale }),
    getContentTags({ locale, kind: "articles", q: "", limit: 8 }),
  ]);
  return (
    <ArticlesView result={result} category={parsed.data.category} tags={tags} />
  );
}
