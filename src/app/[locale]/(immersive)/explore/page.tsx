import type { Metadata } from "next";
import { CoastalSpaceView } from "@/modules/world/ui/CoastalSpaceView";
import { getPageMetadata } from "@/server/seo/metadata";
import {
  getCurrentPrincipal,
  listConfiguredOAuthProviders,
} from "@/modules/identity/server";
import { IdentityProvider } from "@/modules/identity/ui/IdentityProvider";

export async function generateMetadata(): Promise<Metadata> {
  return {
    ...(await getPageMetadata("/explore")),
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
