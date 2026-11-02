import { uploadedImageResponse } from "@/modules/media/server";
import { defineRoute } from "@/server/http/route";
export const runtime = "nodejs";
export const GET = defineRoute<{ filename: string }>(
  async (_request, { params }) =>
    uploadedImageResponse((await params).filename),
);
