import { SiteAboutView } from "@/modules/content/ui/about/SiteAboutView";
import { getPageMetadata } from "@/server/seo/metadata";
export const generateMetadata = () => getPageMetadata("/site");
export default function Page() {
  return <SiteAboutView />;
}
