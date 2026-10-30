import { Link } from "@/shared/i18n/navigation";
import { MiniSketch } from "@/components/Sketch";
import { getTranslations } from "next-intl/server";
export default async function NotFound() {
  const t = await getTranslations("notFound");
  return (
    <main id="main-content" className="not-found">
      <MiniSketch kind="boat" />
      <div className="eyebrow">404 · A LITTLE DETOUR</div>
      <h1>{t("title")}</h1>
      <p>{t("description")}</p>
      <Link href="/" className="button-outline">
        {t("back")}
      </Link>
    </main>
  );
}
