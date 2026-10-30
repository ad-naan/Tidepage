"use client";
import { Link } from "@/shared/i18n/navigation";
import { useTranslations } from "next-intl";
export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("error");
  return (
    <main id="main-content" className="not-found">
      <h1>{t("title")}</h1>
      <p>{t("description")}</p>
      <button className="button-outline" onClick={reset}>
        {t("retry")}
      </button>
      <Link href="/">{t("home")}</Link>
    </main>
  );
}
