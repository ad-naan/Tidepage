import { tagQuerySchema } from "@/modules/content/domain/tags";
import { getContentTags } from "@/modules/content/server";
import { defineRoute, jsonData } from "@/server/http/route";

export const GET = defineRoute(async (request, { requestId }) => {
  const query = tagQuerySchema.parse(
    Object.fromEntries(new URL(request.url).searchParams),
  );
  return jsonData(await getContentTags(query), requestId);
});
