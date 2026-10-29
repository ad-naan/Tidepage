import { getNotes } from "@/modules/content/server";
import { defineRoute, jsonData } from "@/server/http/route";
export const GET = defineRoute(async (_request, { requestId }) =>
  jsonData(await getNotes(), requestId),
);
