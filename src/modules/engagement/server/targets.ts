import "server-only";
import {
  getArticle,
  getArticles,
  getNotes,
  getProjects,
} from "@/modules/content/server";
import { notFoundError } from "@/server/http/errors";
import type { EngagementTarget } from "@/modules/engagement/domain/target";
import type { Locale } from "@/shared/i18n/config";

export async function requireEngagementTarget(
  target: EngagementTarget,
  locale: Locale,
  reads = { getArticle, getNotes, getProjects },
) {
  const exists =
    target.type === "article"
      ? await reads.getArticle(target.id, locale)
      : target.type === "note"
        ? (await reads.getNotes(locale)).some((item) => item.id === target.id)
        : target.type === "project"
          ? (await reads.getProjects(locale)).some(
              (item) => item.id === target.id,
            )
          : target.id === "about";
  if (!exists) throw notFoundError();
}
export async function requireEngagementTargets(
  type: EngagementTarget["type"],
  ids: string[],
  locale: Locale,
  reads = { getArticles, getNotes, getProjects },
) {
  const visible = new Set(
    type === "article"
      ? (await reads.getArticles(locale)).map((item) => item.slug)
      : type === "note"
        ? (await reads.getNotes(locale)).map((item) => item.id)
        : type === "project"
          ? (await reads.getProjects(locale)).map((item) => item.id)
          : ["about"],
  );
  if (ids.some((id) => !visible.has(id))) throw notFoundError();
}
