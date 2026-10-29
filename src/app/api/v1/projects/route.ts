import { localeQuerySchema } from "@/shared/i18n/schema";
import { getProjects } from "@/modules/content/server";
import { defineRoute, jsonData } from "@/server/http/route";
export const GET = defineRoute(async (request, { requestId }) =>
  jsonData(await getProjects(localeQuerySchema.parse(new URL(request.url).searchParams.get("locale") ?? undefined)), requestId),
);
