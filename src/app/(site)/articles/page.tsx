import { Suspense } from "react";
import { ArticleIndex } from "@/modules/content/ui/ArticleIndex";
import { listArticles } from "@/modules/content/server";
import { pageMetadata } from "@/server/seo/metadata";
export const metadata = pageMetadata(
  "/articles",
  "文章",
  "关于技术、产品与生活的文章与思考。",
);
import { redirect } from "next/navigation";
import { articleQuerySchema } from "@/modules/content/domain/query";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const input = await searchParams;
  const parsed = articleQuerySchema.safeParse({
    page: input.page,
    pageSize: 12,
    q: input.q,
    category: input.category,
  });
  if (!parsed.success) redirect("/articles");
  const result = await listArticles(parsed.data);
  return (
    <Suspense fallback={<p className="loading">正在翻开新的一页…</p>}>
      <ArticleIndex result={result} />
    </Suspense>
  );
}
