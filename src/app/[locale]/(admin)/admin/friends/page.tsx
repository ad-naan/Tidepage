import { FriendsManagerView } from "@/modules/friends/ui/admin/FriendsManagerView";
import { listFriendPublications } from "@/modules/friends/server";
import { getCurrentPrincipal } from "@/modules/identity/server";
import { workbenchRecords } from "@/server/workbench/records";

export default async function Page() {
  const principal = await getCurrentPrincipal();
  if (!principal || principal.role === "reader") return null;
  const canPublish = principal.role === "admin";
  const [drafts, published] = await Promise.all([
    workbenchRecords().read(principal.id, "friends"),
    canPublish ? listFriendPublications(principal.id) : [],
  ]);
  return (
    <FriendsManagerView
      initialItems={drafts.value ?? []}
      initialPublished={published}
      canPublish={canPublish}
    />
  );
}
