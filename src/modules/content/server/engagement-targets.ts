import "server-only";
import { sql } from "drizzle-orm";
import {
  articlesTable as articles,
  notesTable as notes,
  projectsTable as projects,
} from "@/modules/content/infrastructure/schema";
import { published } from "@/modules/content/infrastructure/postgres-repository";

/** Rows are keyed by content type, public identifier and language. */
export function publishedEngagementTargets(ownerId: string | null) {
  return sql`
    select 'article' as type, ${articles.slug} as id, ${articles.locale} as locale, ${articles.title} as title
    from ${articles}
    where ${published(articles)} ${ownerId ? sql`and ${articles.sourceOwner} = ${ownerId}` : sql.empty()}
    union all
    select 'note', ${notes.id}, ${notes.locale}, left(${notes.text}, 100)
    from ${notes}
    where ${published(notes)} ${ownerId ? sql`and ${notes.sourceOwner} = ${ownerId}` : sql.empty()}
    union all
    select 'project', ${projects.id}, ${projects.locale}, ${projects.name}
    from ${projects}
    where ${published(projects)} ${ownerId ? sql`and ${projects.sourceOwner} = ${ownerId}` : sql.empty()}
  `;
}
