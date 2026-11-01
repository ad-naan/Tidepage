import "server-only";
import { getTranslations } from "next-intl/server";
import {
  friendLinkSchema,
  type FriendDirectory,
} from "@/modules/friends/domain/models";
import type { Locale } from "@/shared/i18n/config";

/** Explicit preview adapter. Replace here with the reviewed-links use case when persistence is ready. */
export async function getFriendDirectory(
  locale: Locale,
): Promise<FriendDirectory> {
  const t = await getTranslations({ locale, namespace: "friends.samples" });
  const samples = [
    { id: "tideline", category: "technology" },
    { id: "paper", category: "design" },
    { id: "island", category: "life" },
    { id: "beacon", category: "technology" },
  ] as const;
  return {
    preview: true,
    items: samples.map(({ id, category }) =>
      friendLinkSchema.parse({
        id,
        category,
        name: t(`${id}.name`),
        description: t(`${id}.description`),
        url: `https://${id}.example/`,
      }),
    ),
  };
}
