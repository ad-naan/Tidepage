import { getLocale } from "next-intl/server";
import { NotesView } from "@/modules/content/ui/notes/NotesView";
import { getNote, listNotes, getContentTags } from "@/modules/content/server";
import { tagFilterSchema } from "@/modules/content/domain/tags";
import { redirect } from "@/shared/i18n/navigation";
import { collectionItemId } from "@/modules/content/domain/managed-collections";
import { getReadingImageDimensions } from "@/modules/content/server/reading-image-dimensions";
import { getPageMetadata } from "@/server/seo/metadata";
import { getPublicSiteAvatar } from "@/modules/site-settings/server";
export const generateMetadata = () => getPageMetadata("/notes");
export default async function Page({
  searchParams,
}: PageProps<"/[locale]/notes">) {
  const locale = await getLocale();
  const params = await searchParams;
  const id = collectionItemId.safeParse(params.open).data;
  const parsedTag = tagFilterSchema.optional().safeParse(params.tag);
  if (!parsedTag.success) return redirect({ href: "/notes", locale });
  const tag = parsedTag.data;
  const [notes, selected, tags, authorAvatar] = await Promise.all([
    listNotes(locale, undefined, tag),
    id ? getNote(id, locale) : null,
    getContentTags({ locale, kind: "notes", q: "", limit: 8 }),
    getPublicSiteAvatar(locale),
  ]);
  const initialNote = selected
    ? {
        ...selected,
        imageDimensions: await getReadingImageDimensions([selected.body]),
      }
    : null;
  return (
    <NotesView
      key={`${id ?? ""}:${tag ?? ""}`}
      notes={notes}
      initialNote={initialNote}
      tags={tags}
      authorAvatar={authorAvatar}
    />
  );
}
