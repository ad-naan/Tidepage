import { NotesView } from "@/modules/content/ui/NotesView";
import { getNotes } from "@/modules/content/server";
import { pageMetadata } from "@/server/seo/metadata";
export const metadata = pageMetadata(
  "/notes",
  "手记",
  "日常片段、开发手记和还在生长的念头。",
);
export default async function Page() {
  const notes = await getNotes();
  return <NotesView notes={notes} />;
}
