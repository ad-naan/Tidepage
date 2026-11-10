import "server-only";
import { sql } from "drizzle-orm";
import { getDb, type Database } from "@/server/db/client";
import { publishedEngagementTargets } from "@/modules/content/server/engagement-targets";
import type { Principal } from "@/modules/identity/domain/principal";
import { usersTable } from "@/modules/identity/server/schema";
import { locales, type Locale } from "@/shared/i18n/config";
import type { EngagementTarget } from "@/modules/engagement/domain/target";
import {
  commentsTable as comments,
  interactionsTable as interactions,
} from "@/modules/engagement/infrastructure/schema";

type Kind = "comment" | "like" | "save";
type Activity = {
  kind: Kind;
  type: EngagementTarget["type"];
  targetId: string;
  locale: Locale;
  title: string | null;
  author: string | null;
  preview: string | null;
  createdAt: string;
};
export type EngagementOverview = {
  counts: Partial<Record<Kind, { total: number; recent: number }>>;
  activity: Activity[];
};

export async function getEngagementOverview(
  principal: Principal,
  db?: Database,
): Promise<EngagementOverview | null> {
  if (principal.role === "reader") return null;
  const siteWide = principal.role === "admin";
  const { rows } = await (db ?? getDb()).execute<EngagementOverview>(sql`
    with targets as (
      ${publishedEngagementTargets(siteWide ? null : principal.id)}
      ${
        siteWide
          ? sql`union all select 'page', 'about', locale, null from unnest(array[${sql.join(
              locales.map((locale) => sql`${locale}::text`),
              sql`, `,
            )}]) as locale`
          : sql.empty()
      }
    ), events as (
      select 'comment' as kind, ${comments.id} as event_id, ${comments.targetType} as type,
        ${comments.targetId} as target_id, ${comments.locale} as locale,
        target.title, ${comments.createdAt} as created_at
      from ${comments}
      inner join targets target on (target.type, target.id, target.locale) =
        (${comments.targetType}, ${comments.targetId}, ${comments.locale})
      union all
      select ${interactions.kind}, ${interactions.userId}, ${interactions.targetType},
        ${interactions.targetId}, ${interactions.locale}, target.title, ${interactions.createdAt}
      from ${interactions}
      inner join targets target on (target.type, target.id, target.locale) =
        (${interactions.targetType}, ${interactions.targetId}, ${interactions.locale})
    ), counts as (
      select kind, count(*) as total,
        count(*) filter (where created_at >= now() - interval '7 days') as recent
      from events group by kind
    ), latest as (
      select * from events
      order by created_at desc, event_id desc, kind, type, target_id, locale
      limit 8
    )
    select
      coalesce((select json_object_agg(kind, json_build_object('total', total, 'recent', recent)) from counts), '{}') as counts,
      coalesce((
        select json_agg(json_build_object(
          'kind', latest.kind, 'type', latest.type, 'targetId', latest.target_id,
          'locale', latest.locale, 'title', latest.title, 'createdAt', latest.created_at,
          'author', ${usersTable.displayName}, 'preview', left(${comments.body}, 180)
        ) order by latest.created_at desc, latest.event_id desc, latest.kind, latest.type, latest.target_id, latest.locale)
        from latest
        left join ${comments} on latest.kind = 'comment' and latest.event_id = ${comments.id}
        left join ${usersTable} on ${comments.userId} = ${usersTable.id}
      ), '[]') as activity
  `);
  return rows[0];
}
