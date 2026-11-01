import { AboutView } from "@/modules/content/ui/about/AboutView";
import { getPageMetadata } from "@/server/seo/metadata";
export const generateMetadata = () => getPageMetadata("/about");
export default function Page() {
  return <AboutView />;
}
