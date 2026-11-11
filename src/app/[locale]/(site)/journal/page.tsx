import { getTranslations } from "next-intl/server";
import { JournalView } from "@/modules/journal/ui/JournalView";

export async function generateMetadata() {
  const t = await getTranslations("journal");
  return {
    title: t("title"),
    description: t("intro"),
    robots: { index: false, follow: false },
  };
}
export default function Page() {
  return <JournalView />;
}
