import "server-only";
import { sql } from "drizzle-orm";
import { getDb, type Database } from "@/server/db/client";
import { publishedEngagementTargets } from "@/modules/content/server/engagement-targets";
import type { Principal } from "@/modules/identity/domain/principal";
import { usersTable } from "@/modules/identity/server/schema";
import { locales, type Locale } from "@/shared/i18n/config";
import type { EngagementTarget } from "@/modules/engagement/domain/target";
import { site } from "@/shared/config/site";
import type { EditorNode } from "@/shared/contracts/rich-text";
import {
  commentsTable as comments,
  interactionsTable as interactions,
} from "@/modules/engagement/infrastructure/schema";

export type EngagementKind = "comment" | "like" | "save";
export type EngagementActivity = {
  id: string;
  kind: EngagementKind;
  type: EngagementTarget["type"];
  targetId: string;
  locale: Locale;
  title: string | null;
  author: string | null;
  readerId: string | null;
  body: string | null;
  document: EditorNode | null;
  createdAt: string;
};
export type EngagementOverview = {
  counts: Partial<Record<EngagementKind, { total: number; recent: number }>>;
  activity: EngagementActivity[];
  days: { date: string; counts: Partial<Record<EngagementKind, number>> }[];
};

export async function getEngagementOverview(
  principal: Principal,
  db?: Database,
  readerId?: string,
): Promise<EngagementOverview | null> {
  if (principal.role === "reader") return null;
  const siteWide = principal.role === "admin";
  if (readerId && !siteWide) return null;
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
        target.title, ${comments.createdAt} as created_at, ${comments.userId} as actor_id
      from ${comments}
      inner join targets target on (target.type, target.id, target.locale) =
        (${comments.targetType}, ${comments.targetId}, ${comments.locale})
      ${readerId ? sql`where ${comments.userId} = ${readerId}` : sql.empty()}
      union all
      select ${interactions.kind}, ${interactions.userId}, ${interactions.targetType},
        ${interactions.targetId}, ${interactions.locale}, target.title, ${interactions.createdAt},
        case when ${interactions.kind} = 'like' then ${interactions.userId} end
      from ${interactions}
      inner join targets target on (target.type, target.id, target.locale) =
        (${interactions.targetType}, ${interactions.targetId}, ${interactions.locale})
      ${readerId ? sql`where ${interactions.userId} = ${readerId} and ${interactions.kind} = 'like'` : sql.empty()}
    ), calendar as (
      select (now() at time zone ${site.timeZone})::date as today
    ), daily as (
      select (created_at at time zone ${site.timeZone})::date as day, kind, count(*) as total
      from events cross join calendar
      where created_at >= ((today - 6)::timestamp at time zone ${site.timeZone})
        and created_at <= now()
      group by 1, 2
    ), counts as (
      select kind, count(*) as total,
        coalesce((select sum(total) from daily where daily.kind = events.kind), 0) as recent
      from events group by kind
    ), ranked as (
      select *, row_number() over (
        partition by kind order by created_at desc, event_id desc, type, target_id, locale
      ) as position
      from events
    )
    select
      coalesce((select json_object_agg(kind, json_build_object('total', total, 'recent', recent)) from counts), '{}') as counts,
      (select json_agg(json_build_object(
        'date', today - offset_days,
        'counts', coalesce((select json_object_agg(kind, total) from daily where day = today - offset_days), '{}')
      ) order by offset_days desc)
      from calendar cross join generate_series(0, 6) as offset_days) as days,
      coalesce((
        select json_agg(json_build_object(
          'id', concat(latest.kind, '-', latest.position),
          'kind', latest.kind, 'type', latest.type, 'targetId', latest.target_id,
          'locale', latest.locale, 'title', latest.title, 'createdAt', latest.created_at,
          'author', ${usersTable.displayName}, 'body', ${comments.body},
          'document', ${comments.document},
          'readerId', case when ${siteWide} and ${usersTable.role} = 'reader' then ${usersTable.id} end
        ) order by latest.created_at desc, latest.event_id desc, latest.kind, latest.type, latest.target_id, latest.locale)
        from ranked latest
        left join ${comments} on latest.kind = 'comment' and latest.event_id = ${comments.id}
        left join ${usersTable} on latest.actor_id = ${usersTable.id}
        where latest.position <= 8
      ), '[]') as activity
  `);
  return rows[0];
}
