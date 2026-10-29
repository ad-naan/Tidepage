import { Shell } from "@/components/Shell";
import { CustomScrollbars } from "@/components/CustomScrollbars";
import { PreviewIdentityProvider } from "@/modules/identity/ui/PreviewIdentity";
import { getArticles } from "@/modules/content/server";
// Rendering remains live after database updates; content caching belongs to the service.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export default async function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const articles = await getArticles();
  return (
    <PreviewIdentityProvider>
      <Shell articles={articles}>{children}</Shell>
      <CustomScrollbars />
    </PreviewIdentityProvider>
  );
}
