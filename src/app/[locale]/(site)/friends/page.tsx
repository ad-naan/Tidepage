import { getLocale, getTranslations } from "next-intl/server";
import { FriendsView } from "@/modules/friends/ui/FriendsView";
import { getFriendDirectory } from "@/modules/friends/server";
import { getPageMetadata, absoluteUrl } from "@/server/seo/metadata";
import { profile } from "@/shared/config/profile";

export const generateMetadata = () => getPageMetadata("/friends");
export default async function Page() {
  const locale = await getLocale();
  const [directory, t] = await Promise.all([
    getFriendDirectory(locale),
    getTranslations("site"),
  ]);
  return (
    <FriendsView
      directory={directory}
      siteInfo={{
        name: t("name"),
        description: t("description"),
        url: absoluteUrl("/"),
        avatar: absoluteUrl(profile.avatar),
      }}
    />
  );
}
