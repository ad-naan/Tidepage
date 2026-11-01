import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/shared/ui/page-header/PageHeader";
export default async function Page() {
  const t = await getTranslations("admin");
  return (
    <>
      <PageHeader
        title={t("nav.comments")}
        description={t("future.comments")}
      />
    </>
  );
}
