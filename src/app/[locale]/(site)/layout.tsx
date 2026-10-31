import { getLocale } from "next-intl/server";
import { Shell } from "@/components/Shell";
import { CustomScrollbars } from "@/components/CustomScrollbars";
import { PreviewIdentityProvider } from "@/modules/identity/ui/PreviewIdentity";
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
  const [articles, notes, projects] = await Promise.all([
    getArticles(locale),
    getNotes(locale),
    getProjects(locale),
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
    <PreviewIdentityProvider>
      <Shell articles={articles} navigation={navigation}>
        {children}
      </Shell>
      <CustomScrollbars />
    </PreviewIdentityProvider>
  );
}
