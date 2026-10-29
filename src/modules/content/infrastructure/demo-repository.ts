import type { ContentRepository } from "../application/repository";
import { summarize, type Article, type Note, type Project } from "../domain/models";
import { articles, notes, projects, quotes } from "./demo-data";
import { englishArticles, englishNotes, englishProjects, englishQuotes } from "./demo-en";
import type { Locale } from "@/shared/i18n/config";
const categories:Record<string,Article["category"]>={"技术":"technology","产品":"product","生活":"life"};
const projectCategories:Record<string,string>={"产品":"product","开源":"open-source","实验":"experiment"};
export const seedArticles:Article[]=[...articles.map(a=>({...a,locale:"zh-CN" as const,category:categories[a.category],updatedAt:new Date(a.date).toISOString()})),...englishArticles];
export const demoNotes:Note[]=[...notes.map(n=>({...n,locale:"zh-CN" as const,publishedOn:`2026-${n.date.match(/\d+/g)!.map(v=>v.padStart(2,"0")).join("-")}`})),...englishNotes];
export const demoQuotes=[...quotes.map((q,i)=>({...q,locale:"zh-CN" as const,id:`q${i+1}`})),...englishQuotes];
export const seedProjects:Project[]=[...projects.map(p=>({...p,locale:"zh-CN" as const,category:projectCategories[p.category]})),...englishProjects];
function publicArticles(locale:Locale){return seedArticles.filter(a=>a.locale===locale&&new Date(a.date).getTime()<=Date.now()).sort((a,b)=>b.date.localeCompare(a.date)||a.slug.localeCompare(b.slug));}
export const demoContentRepository:ContentRepository={
 allArticles:async locale=>publicArticles(locale).map(summarize),
 articleBySlug:async(slug,locale)=>publicArticles(locale).find(a=>a.slug===slug)??null,
 articleLocales:async slug=>seedArticles.filter(a=>a.slug===slug&&new Date(a.date).getTime()<=Date.now()).map(a=>a.locale),
 listArticles:async query=>{
  const items=publicArticles(query.locale).filter(a=>(!query.category||a.category===query.category)&&`${a.title} ${a.excerpt} ${a.tags.join(" ")}`.toLocaleLowerCase(query.locale).includes(query.q.toLocaleLowerCase(query.locale)));
  return {items:items.slice((query.page-1)*query.pageSize,query.page*query.pageSize).map(summarize),total:items.length,page:query.page,pageSize:query.pageSize,pageCount:Math.ceil(items.length/query.pageSize)};
 },
 notes:async locale=>demoNotes.filter(n=>n.locale===locale),projects:async locale=>seedProjects.filter(p=>p.locale===locale),quotes:async locale=>demoQuotes.filter(q=>q.locale===locale),
};
