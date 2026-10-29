import { articles, notes, projects, quotes } from "./demo-data";
import { summarize, type Article, type Note } from "../domain/models";
import type { ContentRepository } from "../application/repository";
const publicArticles = () =>
  articles
    .filter((a) => new Date(a.date).getTime() <= Date.now())
    .map(
      (a) =>
        ({ ...a, updatedAt: new Date(a.date).toISOString() }) satisfies Article,
    )
    .sort(
      (a, b) => b.date.localeCompare(a.date) || a.slug.localeCompare(b.slug),
    );
export const demoNotes: Note[] = notes.map((n) => ({
  ...n,
  publishedOn: `2026-${n.date
    .match(/\d+/g)!
    .map((v) => v.padStart(2, "0"))
    .join("-")}`,
}));
export const demoQuotes = quotes.map((q, i) => ({ ...q, id: `q${i + 1}` }));
export const demoContentRepository: ContentRepository = {
  allArticles: async () => publicArticles().map(summarize),
  articleBySlug: async (slug) =>
    publicArticles().find((a) => a.slug === slug) ?? null,
  listArticles: async (query) => {
    const items = publicArticles().filter(
      (a) =>
        (!query.category || a.category === query.category) &&
        `${a.title} ${a.excerpt} ${a.tags.join(" ")}`
          .toLocaleLowerCase()
          .includes(query.q.toLocaleLowerCase()),
    );
    return {
      items: items
        .slice((query.page - 1) * query.pageSize, query.page * query.pageSize)
        .map(summarize),
      total: items.length,
      page: query.page,
      pageSize: query.pageSize,
      pageCount: Math.ceil(items.length / query.pageSize),
    };
  },
  notes: async () => demoNotes,
  projects: async () => projects,
  quotes: async () => demoQuotes,
};
