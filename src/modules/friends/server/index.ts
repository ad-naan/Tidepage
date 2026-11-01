import "server-only";
import type { FriendDirectory } from "@/modules/friends/domain/models";
import type { Locale } from "@/shared/i18n/config";
// No reviewed-link persistence has been connected yet; never fabricate a directory.
export async function getFriendDirectory(
  _locale: Locale,
): Promise<FriendDirectory> {
  return { items: [] };
}
