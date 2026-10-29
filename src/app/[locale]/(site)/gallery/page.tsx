import { getPageMetadata } from "@/server/seo/metadata";
import { Gallery } from "@/components/Gallery";
export const generateMetadata = () => getPageMetadata("/gallery");
export default function Page() {
  return <Gallery />;
}
