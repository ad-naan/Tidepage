import { getLocale } from "next-intl/server";
import { SiteShell } from "@/widgets/site-shell/SiteShell";
import { CustomScrollbars } from "@/shared/ui/scroll-area/CustomScrollbars";
import { IdentityProvider } from "@/modules/identity/ui/IdentityProvider";
import {
  getCurrentPrincipal,
  listConfiguredOAuthProviders,
} from "@/modules/identity/server";
import { getArticles, getNotes, getProjects } from "@/modules/content/server";
// Rendering remains live after database updates; content caching belongs to the service.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export default async function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const [articles, notes, projects, principal, providers] = await Promise.all([
    getArticles(locale),
    getNotes(locale),
    getProjects(locale),
    getCurrentPrincipal(),
    listConfiguredOAuthProviders(),
  ]);
  const navigation = {
    note: notes[0]
      ? { mood: notes[0].mood, date: notes[0].date, text: notes[0].text }
      : null,
    projects: projects
      .slice(0, 3)
      .map(({ id, name, subtitle }) => ({ id, name, subtitle })),
  };
  return (
    <IdentityProvider principal={principal} providers={providers}>
      <SiteShell articles={articles} navigation={navigation}>
        {children}
      </SiteShell>
      <CustomScrollbars />
    </IdentityProvider>
  );
}
