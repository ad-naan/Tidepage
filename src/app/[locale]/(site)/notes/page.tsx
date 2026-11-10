import { getLocale } from "next-intl/server";
import { NotesView } from "@/modules/content/ui/notes/NotesView";
import { getNote, listNotes } from "@/modules/content/server";
import { collectionItemId } from "@/modules/content/domain/managed-collections";
import { getReadingImageDimensions } from "@/modules/content/server/reading-image-dimensions";
import { getPageMetadata } from "@/server/seo/metadata";
export const generateMetadata = () => getPageMetadata("/notes");
export default async function Page({
  searchParams,
}: PageProps<"/[locale]/notes">) {
  const locale = await getLocale();
  const id = collectionItemId.safeParse((await searchParams).open).data;
  const [notes, selected] = await Promise.all([
    listNotes(locale),
    id ? getNote(id, locale) : null,
  ]);
  const initialNote = selected
    ? {
        ...selected,
        imageDimensions: await getReadingImageDimensions([selected.body]),
      }
    : null;
  return <NotesView key={id} notes={notes} initialNote={initialNote} />;
}
