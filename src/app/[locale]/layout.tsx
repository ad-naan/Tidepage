import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { isLocale } from "@/shared/i18n/config";
export default async function LocaleLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  return children;
}
