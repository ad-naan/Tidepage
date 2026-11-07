import { navigationItems } from "@/shared/config/site";

export function settingList(value = ""): string[] {
  return [
    ...new Set(
      value
        .split(/[,，\n]/)
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  ];
}

export function resolveSitePresentation(fields: Record<string, string>) {
  const order = settingList(fields.navigationOrder);
  return {
    navigation: [
      ...order.flatMap((key) =>
        navigationItems.filter((item) => item.key === key),
      ),
      ...navigationItems.filter((item) => !order.includes(item.key)),
    ],
    footer: fields.footer?.trim() ?? "",
    publicContact: fields.publicContact?.trim() ?? "",
    featuredSlugs: settingList(fields.featuredSlugs)
      .filter((slug) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))
      .slice(0, 5),
  };
}

export type SitePresentation = ReturnType<typeof resolveSitePresentation>;

/** Saved selections lead; missing/unpublished entries are filled by recent content. */
export function arrangeFeatured<T extends { slug: string }>(
  selected: (T | null)[],
  recent: T[],
  limit = 5,
): T[] {
  const seen = new Set<string>();
  return [...selected, ...recent]
    .filter((item): item is T => {
      if (!item || seen.has(item.slug)) return false;
      seen.add(item.slug);
      return true;
    })
    .slice(0, limit);
}
