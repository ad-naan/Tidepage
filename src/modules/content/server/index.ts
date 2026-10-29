import "server-only";
import { cache } from "react";
import { z } from "zod";
import { getEnv } from "@/server/config/env";
import { getCacheStore } from "@/server/cache/redis";
import { createRemember } from "@/server/cache/remember";
import { createContentService } from "../application/service";
import { articleSchema, slugSchema } from "../domain/models";
import type { ContentRepository } from "../application/repository";
import { defaultLocale, type Locale } from "@/shared/i18n/config";
let repositoryPromise: Promise<ContentRepository> | undefined;
async function repository() {
  return repositoryPromise ??= getEnv().CONTENT_SOURCE === "postgres"
    ? import("../infrastructure/postgres-repository").then(m=>m.postgresContentRepository())
    : import("../infrastructure/demo-repository").then(m=>m.demoContentRepository);
}
let remember: ReturnType<typeof createRemember> | undefined;
function memo(){return remember ??= createRemember(getCacheStore());}
const service=async()=>createContentService(await repository());
const key=(locale:Locale,resource:string)=>`${getEnv().CONTENT_SOURCE}:${locale}:content:${resource}`;
export const getArticles=cache(async(locale:Locale=defaultLocale)=>memo()(key(locale,"articles"),getEnv().CACHE_TTL_SECONDS,z.array(articleSchema.omit({sections:true})),async()=>(await service()).allArticles(locale)));
export const getArticle=cache(async(input:string,locale:Locale=defaultLocale)=>{const slug=slugSchema.parse(input);return memo()(key(locale,`article:${slug}`),getEnv().CACHE_TTL_SECONDS,articleSchema.nullable(),async()=>(await service()).articleBySlug(slug,locale));});
export const getArticleLocales=cache(async(slug:string)=>(await service()).articleLocales(slug));
export const listArticles=async(input:unknown)=>(await service()).listArticles(input);
export const getNotes=cache(async(locale:Locale=defaultLocale)=>(await service()).notes(locale));
export const getProjects=cache(async(locale:Locale=defaultLocale)=>(await service()).projects(locale));
export const getQuotes=cache(async(locale:Locale=defaultLocale)=>(await service()).quotes(locale));
export async function invalidateContentCache(slug:string,locale:Locale){const store=getCacheStore();await Promise.all([store.delete(key(locale,"articles")),store.delete(key(locale,`article:${slug}`))]);}
export { articleMarkdown } from "../application/markdown";
