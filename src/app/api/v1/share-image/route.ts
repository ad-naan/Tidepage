import { getArticle } from "@/modules/content/server";
import { slugSchema } from "@/modules/content/domain/models";
import { getPublicSiteIdentity } from "@/modules/site-settings/server";
import { defaultLocale, isLocale } from "@/shared/i18n/config";
import { createShareImage } from "@/modules/site-settings/server/share-image";

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams;
  const locale = query.get("locale") ?? defaultLocale;
  const slug = query.get("article");
  if (
    !isLocale(locale) ||
    (slug !== null && !slugSchema.safeParse(slug).success)
  )
    return new Response(null, { status: 404 });

  const [identity, article] = await Promise.all([
    getPublicSiteIdentity(locale),
    slug === null ? null : getArticle(slug, locale),
  ]);
  if (slug !== null && !article) return new Response(null, { status: 404 });
  return createShareImage({ locale, identity, article: article ?? undefined });
}
