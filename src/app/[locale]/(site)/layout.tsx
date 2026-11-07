import { getLocale } from "next-intl/server";
import { SiteShell } from "@/widgets/site-shell/SiteShell";
import { CustomScrollbars } from "@/shared/ui/scroll-area/CustomScrollbars";
import { IdentityProvider } from "@/modules/identity/ui/IdentityProvider";
import { ReadingArticleProvider } from "@/modules/content/ui/articles/ReadingArticleContext";
import {
  getCurrentPrincipal,
  listConfiguredOAuthProviders,
} from "@/modules/identity/server";
import {
  getFeaturedArticles,
  getLatestNote,
  getProjectPreviews,
} from "@/modules/content/server";
// Rendering remains live after database updates; content caching belongs to the service.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export default async function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const [articles, note, projects, principal, providers] = await Promise.all([
    getFeaturedArticles(locale),
    getLatestNote(locale),
    getProjectPreviews(locale),
    getCurrentPrincipal(),
    listConfiguredOAuthProviders(),
  ]);
  return (
    <IdentityProvider principal={principal} providers={providers}>
      <ReadingArticleProvider>
        <SiteShell articles={articles.items} navigation={{ note, projects }}>
          {children}
        </SiteShell>
      </ReadingArticleProvider>
      <CustomScrollbars />
    </IdentityProvider>
  );
}
