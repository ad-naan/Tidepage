import { getTranslations } from "next-intl/server";

export default async function Loading() {
  const t = await getTranslations("common");
  return (
    <p className="loading" role="status">
      {t("loading")}
    </p>
  );
}
