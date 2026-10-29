import { pageMetadata } from "@/server/seo/metadata";
import { Gallery } from "@/components/Gallery";
export const metadata = pageMetadata(
  "/gallery",
  "照片廊",
  "记录沿途的风景与日常。",
);
export default function Page() {
  return <Gallery />;
}
