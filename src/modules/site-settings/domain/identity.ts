export type SiteIdentity = {
  name: string;
  title: string;
  description: string;
};

/** Only these public fields can leave the private settings record. */
export function resolveSiteIdentity(
  fields: Record<string, string> | undefined,
  defaults: SiteIdentity,
): SiteIdentity {
  const name = fields?.siteName?.trim() || defaults.name;
  return {
    name,
    title:
      fields?.seoTitle?.trim() ||
      (name === defaults.name ? defaults.title : `${name} · adnaan`),
    description:
      fields?.seoDescription?.trim() ||
      fields?.siteDescription?.trim() ||
      defaults.description,
  };
}
