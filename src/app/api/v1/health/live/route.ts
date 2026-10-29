import { defineRoute, jsonData } from "@/server/http/route";
export const GET = defineRoute(async (_request, { requestId }) =>
  jsonData({ status: "alive" }, requestId),
);
