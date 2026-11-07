import { getLocale } from "next-intl/server";
import { FriendsView } from "@/modules/friends/ui/FriendsView";
import { listPublicFriends } from "@/modules/friends/server";
import {
  getPublicSiteAvatar,
  getPublicSiteIdentity,
} from "@/modules/site-settings/server";
import { getPageMetadata, absoluteUrl } from "@/server/seo/metadata";

export const generateMetadata = () => getPageMetadata("/friends");
export default async function Page() {
  const locale = await getLocale();
  const [identity, avatar, friends] = await Promise.all([
    getPublicSiteIdentity(locale),
    getPublicSiteAvatar(locale),
    listPublicFriends(locale),
  ]);
  return (
    <FriendsView
      friends={friends}
      siteInfo={{
        name: identity.name,
        description: identity.description,
        url: absoluteUrl("/"),
        avatar: absoluteUrl(avatar),
      }}
    />
  );
}
