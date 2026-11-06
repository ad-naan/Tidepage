import type { Metadata } from "next";
import { CoastalSpaceView } from "@/modules/world/ui/CoastalSpaceView";
import { getLocale, getTranslations } from "next-intl/server";
import { pageMetadata } from "@/server/seo/metadata";
import {
  getCurrentPrincipal,
  listConfiguredOAuthProviders,
} from "@/modules/identity/server";
import { IdentityProvider } from "@/modules/identity/ui/IdentityProvider";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = await getTranslations("world");
  return {
    ...pageMetadata("/explore", t("name"), t("description"), locale),
    robots: { index: false, follow: true },
  };
}

export default async function ExplorePage() {
  const principal = await getCurrentPrincipal();
  return (
    <IdentityProvider
      principal={principal}
      providers={listConfiguredOAuthProviders()}
    >
      <CoastalSpaceView />
    </IdentityProvider>
  );
}
