import { getLocale, getTranslations } from "next-intl/server";
import { NotesView } from "@/modules/content/ui/NotesView";
import { getNotes } from "@/modules/content/server";
import { getPageMetadata } from "@/server/seo/metadata";
export const generateMetadata = () => getPageMetadata("/notes");
export default async function Page() {
  const locale = await getLocale();
  const notes = await getNotes(locale);
  return <NotesView notes={notes} />;
}
