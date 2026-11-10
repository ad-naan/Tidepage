import { sql, type SQLWrapper } from "drizzle-orm";
import type { PublicListKind } from "@/shared/contracts/public-list-order";
import type { Locale } from "@/shared/i18n/config";
import { publicListOrdersTable as orders } from "./public-list-order-schema";

/** Unranked entries keep the list's original order after manually arranged entries. */
export function publicListRank(
  kind: PublicListKind,
  locale: Locale,
  id: SQLWrapper,
) {
  return sql<number>`coalesce(((select ${orders.ranks} from ${orders} where ${orders.kind} = ${kind} and ${orders.locale} = ${locale}) ->> ${id})::integer, 2147483647)`;
}
