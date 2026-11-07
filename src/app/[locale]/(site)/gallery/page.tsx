import { getLocale } from "next-intl/server";
import { getPageMetadata } from "@/server/seo/metadata";
import { GalleryView } from "@/modules/content/ui/gallery/GalleryView";
import { listGalleryPhotos } from "@/modules/content/server/gallery";
export const generateMetadata = () => getPageMetadata("/gallery");
export default async function Page() {
  return <GalleryView photos={await listGalleryPhotos(await getLocale())} />;
}
