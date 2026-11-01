import { getTranslations } from "next-intl/server";
import { MediaPicker } from "@/modules/media/ui/admin/MediaPicker";
import { PageHeader } from "@/shared/ui/page-header/PageHeader";
export default async function Page() {
  const t = await getTranslations("admin");
  return (
    <>
      <PageHeader title={t("nav.media")} description={t("media.local")} />
      <MediaPicker management />
    </>
  );
}
