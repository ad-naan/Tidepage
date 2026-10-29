import { requirePrincipal } from "@/modules/identity/server";
import { defineRoute, jsonData } from "@/server/http/route";
export const GET = defineRoute(async (_request, { requestId }) =>
  jsonData(await requirePrincipal(), requestId),
);
