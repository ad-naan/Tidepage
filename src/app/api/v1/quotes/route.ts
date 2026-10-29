import { localeQuerySchema } from "@/shared/i18n/schema";
import { getQuotes } from "@/modules/content/server";
import { defineRoute, jsonData } from "@/server/http/route";
export const GET = defineRoute(async (request, { requestId }) =>
  jsonData(await getQuotes(localeQuerySchema.parse(new URL(request.url).searchParams.get("locale") ?? undefined)), requestId),
);
