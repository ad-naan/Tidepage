import "server-only";
import { cache } from "react";
import { z } from "zod";
import { getEnv } from "@/server/config/env";
import { getCacheStore } from "@/server/cache/redis";
import { createRemember } from "@/server/cache/remember";
import { createContentService } from "../application/service";
import { articleSchema, slugSchema } from "../domain/models";
import type { ContentRepository } from "../application/repository";

let repositoryPromise: Promise<ContentRepository> | undefined;
async function repository() {
  return (repositoryPromise ??=
    getEnv().CONTENT_SOURCE === "postgres"
      ? import("../infrastructure/postgres-repository").then((m) =>
          m.postgresContentRepository(),
        )
      : import("../infrastructure/demo-repository").then(
          (m) => m.demoContentRepository,
        ));
}
let remember: ReturnType<typeof createRemember> | undefined;
function memo() {
  return (remember ??= createRemember(getCacheStore()));
}
const service = async () => createContentService(await repository());
export const getArticles = cache(async () =>
  memo()(
    `${getEnv().CONTENT_SOURCE}:content:articles`,
    getEnv().CACHE_TTL_SECONDS,
    z.array(articleSchema.omit({ sections: true })),
    async () => (await service()).allArticles(),
  ),
);
export const getArticle = cache(async (input: string) => {
  const slug = slugSchema.parse(input);
  return memo()(
    `${getEnv().CONTENT_SOURCE}:content:article:${slug}`,
    getEnv().CACHE_TTL_SECONDS,
    articleSchema.nullable(),
    async () => (await service()).articleBySlug(slug),
  );
});
export const listArticles = async (input: unknown) =>
  (await service()).listArticles(input);
export const getNotes = cache(async () => (await service()).notes());
export const getProjects = cache(async () => (await service()).projects());
export const getQuotes = cache(async () => (await service()).quotes());
// Call after a successful content write transaction. Unlisted details expire within TTL.
export async function invalidateContentCache(slug: string) {
  const store = getCacheStore();
  await Promise.all([
    store.delete(`${getEnv().CONTENT_SOURCE}:content:articles`),
    store.delete(`${getEnv().CONTENT_SOURCE}:content:article:${slug}`),
  ]);
}

export { articleMarkdown } from "../application/markdown";
