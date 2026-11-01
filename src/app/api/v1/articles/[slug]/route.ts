import { getArticle, listArticles } from "@/modules/content/server";
import { createArticleReadRoutes } from "@/modules/content/server/http";
export const GET = createArticleReadRoutes({ getArticle, listArticles }).detail;
