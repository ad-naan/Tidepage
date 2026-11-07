import { getLocale } from "next-intl/server";
import { FriendsView } from "@/modules/friends/ui/FriendsView";
import { getPublicSiteIdentity } from "@/modules/site-settings/server";
import { getPageMetadata, absoluteUrl } from "@/server/seo/metadata";
import { profile } from "@/shared/config/profile";

export const generateMetadata = () => getPageMetadata("/friends");
export default async function Page() {
  const locale = await getLocale();
  const identity = await getPublicSiteIdentity(locale);
  return (
    <FriendsView
      siteInfo={{
        name: identity.name,
        description: identity.description,
        url: absoluteUrl("/"),
        avatar: absoluteUrl(profile.avatar),
      }}
    />
  );
}
