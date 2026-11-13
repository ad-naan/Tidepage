import "server-only";
import { sql, type SQL } from "drizzle-orm";
import { getDb, type Database } from "@/server/db/client";
import type { ContentTag, TagQuery } from "@/modules/content/domain/tags";
import { tagKey } from "@/modules/content/domain/tags";

// Match domain/tags.ts for legacy rows as well as newly published tags.
export function tagLabelSql(value: SQL) {
  return sql`regexp_replace(btrim(regexp_replace(normalize(${value}, NFKC), '[[:space:]]+', ' ', 'g')), '^#+ *', '')`;
}
export function tagKeySql(value: SQL) {
  return sql`lower(${tagLabelSql(value)})`;
}
export async function queryContentTags(
  query: TagQuery,
  db: Database = getDb(),
): Promise<ContentTag[]> {
  const pattern = `%${tagKey(query.q).replace(/[\\%_]/g, "\\$&")}%`;
  const now = new Date();
  const result = await db.execute(sql`
    with labels as (
      select distinct 'article:' || slug as content_id,
        ${tagLabelSql(sql`value`)} as label, ${tagKeySql(sql`value`)} as key
      from articles cross join lateral unnest(tags) as value
      where locale = ${query.locale} and visibility = 'published' and published_at <= ${now}
        and ${query.kind !== "notes"}
      union all
      select 'note:' || id, ${tagLabelSql(sql`tag`)}, ${tagKeySql(sql`tag`)}
      from notes
      where locale = ${query.locale} and visibility = 'published' and published_at <= ${now}
        and ${query.kind !== "articles"}
    )
    select key, min(label collate "C") as label, count(distinct content_id)::int as count
    from labels where key <> '' and key like ${pattern}
    group by key order by count desc, key collate "C" asc limit ${query.limit}
  `);
  return result.rows as ContentTag[];
}
