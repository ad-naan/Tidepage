import type { Metadata } from "next";
import { CoastalExperience } from "@/modules/world/ui/CoastalExperience";
import { getLocale, getTranslations } from "next-intl/server";
import { pageMetadata } from "@/server/seo/metadata";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = await getTranslations("world");
  return {
    ...pageMetadata("/explore", t("name"), t("description"), locale),
    robots: { index: false, follow: true },
  };
}

export default function ExplorePage() {
  return <CoastalExperience />;
}
