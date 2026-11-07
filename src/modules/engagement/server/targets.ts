import "server-only";
import { getVisibleContentIds } from "@/modules/content/server";
import { notFoundError } from "@/server/http/errors";
import type { EngagementTarget } from "@/modules/engagement/domain/target";
import type { Locale } from "@/shared/i18n/config";

export function requireEngagementTarget(
  target: EngagementTarget,
  locale: Locale,
  read = getVisibleContentIds,
) {
  return requireEngagementTargets(target.type, [target.id], locale, read);
}

export async function requireEngagementTargets(
  type: EngagementTarget["type"],
  ids: string[],
  locale: Locale,
  read = getVisibleContentIds,
) {
  const visible = new Set(
    type === "page" ? ["about"] : await read(type, ids, locale),
  );
  if (ids.some((id) => !visible.has(id))) throw notFoundError();
}
