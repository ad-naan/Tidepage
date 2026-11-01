import { getPageMetadata } from "@/server/seo/metadata";
import { GalleryView } from "@/modules/content/ui/gallery/GalleryView";
export const generateMetadata = () => getPageMetadata("/gallery");
export default function Page() {
  return <GalleryView />;
}
