import { notFound } from "next/navigation";
import { getCurrentPrincipal } from "@/modules/identity/server";
import { listPublishedCollection } from "@/modules/content/server/managed-collections";
import { workbenchRecords } from "@/server/workbench/records";
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
  const kind = collection as Collection;
  const principal = await getCurrentPrincipal();
  if (!principal || principal.role === "reader") return null;
  const isOwner = principal.role === "admin";
  if (kind === "gallery" && !isOwner) notFound();
  const [drafts, published] = await Promise.all([
    workbenchRecords().read(principal.id, `collection:${kind}`),
    isOwner && kind !== "gallery" ? listPublishedCollection(kind) : [],
  ]);
  return (
    <ContentCollectionView
      key={kind}
      kind={kind}
      initialItems={drafts.value ?? []}
      initialPublished={published}
      canPublish={isOwner || kind === "notes"}
    />
  );
}
