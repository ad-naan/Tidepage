import { notFound } from "next/navigation";
import { ContentCollectionView } from "@/modules/content/ui/admin/ContentCollectionView";
import {
  collections,
  type Collection,
} from "@/modules/content/domain/managed-collections";
export default async function Page({
  params,
}: {
  params: Promise<{ collection: string }>;
}) {
  const { collection } = await params;
  if (!(collections as readonly string[]).includes(collection)) notFound();
  return (
    <ContentCollectionView key={collection} kind={collection as Collection} />
  );
}
