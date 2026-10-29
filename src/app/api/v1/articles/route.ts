import { listArticles } from "@/modules/content/server";
import { defineRoute, jsonData } from "@/server/http/route";
export const GET = defineRoute(async (request, { requestId }) => {
  const query = Object.fromEntries(new URL(request.url).searchParams);
  return jsonData(await listArticles(query), requestId);
});
