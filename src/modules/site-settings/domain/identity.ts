import { isUploadedAssetId } from "@/shared/contracts/asset-path";
import { safeWebUrl } from "@/shared/contracts/rich-text";
import { profile, profileLinks } from "@/shared/config/profile";

export type SiteIdentity = {
  name: string;
  title: string;
  description: string;
  shareImage?: { path: string; alt: string };
};

/** Only these public fields can leave the private settings record. */
export function resolveSiteIdentity(
  fields: Record<string, string> | undefined,
  defaults: SiteIdentity,
): SiteIdentity {
  const name = fields?.siteName?.trim() || defaults.name;
  const sharePath = fields?.shareAssetId ?? "";
  return {
    name,
    title:
      fields?.seoTitle?.trim() ||
      (name === defaults.name ? defaults.title : `${name} · ${profile.name}`),
    description:
      fields?.seoDescription?.trim() ||
      fields?.siteDescription?.trim() ||
      defaults.description,
    ...(isUploadedAssetId(sharePath) && {
      shareImage: {
        path: sharePath,
        alt: fields?.shareAssetIdAlt?.trim() || name,
      },
    }),
  };
}
export function resolveHomeCopy(fields: Record<string, string>) {
  return {
    name: fields.name?.trim() || undefined,
    heading: fields.heroTitle?.trim() || fields.identity?.trim() || undefined,
    description:
      fields.heroDescription?.trim() || fields.intro?.trim() || undefined,
    links: profileLinks.map(({ key, href }) => {
      const configured =
        key !== "spark" && safeWebUrl.safeParse(fields[key]?.trim());
      return {
        key,
        href: configured && configured.success ? configured.data : href,
      };
    }),
  };
}

export type HomeCopy = ReturnType<typeof resolveHomeCopy>;
