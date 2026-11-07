import { z } from "zod";
import { listAssets, uploadImage, archiveAsset } from "@/modules/media/server";
import { maxImageBytes } from "@/modules/media/domain/assets";
import { isUploadedAssetId } from "@/modules/media/domain/asset-path";
import { requirePrincipal } from "@/modules/identity/server";
import { boundedBody, boundedJson } from "@/server/http/body";
import { requireSameOrigin } from "@/server/http/origin";
import { enforceAccountRateLimit } from "@/server/http/rate-limit";
import { validationError } from "@/server/http/errors";
import { defineRoute, jsonData } from "@/server/http/route";
export const runtime = "nodejs";
export const GET = defineRoute(async (request, { requestId }) => {
  const user = await requirePrincipal(["author", "admin"]);
  return jsonData(
    await listAssets(
      user.id,
      new URL(request.url).searchParams.get("archived") === "true",
    ),
    requestId,
  );
});
export const POST = defineRoute(async (request, { requestId }) => {
  requireSameOrigin(request);
  const user = await requirePrincipal(["author", "admin"]);
  await enforceAccountRateLimit(user.id, "upload", 40, 60);
  const type = request.headers.get("content-type") ?? "";
  if (!type.startsWith("multipart/form-data;")) throw validationError();
  const data = await new Response(
    await boundedBody(request, maxImageBytes + 64 * 1024),
    { headers: { "content-type": type } },
  ).formData();
  const file = data.get("file");
  if (!(file instanceof File) || data.getAll("file").length !== 1)
    throw validationError();
  return jsonData(
    await uploadImage(
      user.id,
      Buffer.from(await file.arrayBuffer()),
      file.name,
    ),
    requestId,
    { status: 201 },
  );
});
export const PATCH = defineRoute(async (request, { requestId }) => {
  requireSameOrigin(request);
  const user = await requirePrincipal(["author", "admin"]);
  const value = z
    .object({ id: z.string().refine(isUploadedAssetId), archived: z.boolean() })
    .strict()
    .parse(await boundedJson(request, 2048));
  await archiveAsset(user.id, value.id, value.archived);
  return jsonData({ saved: true }, requestId);
});
