import { z } from "zod";
import { requirePrincipal } from "@/modules/identity/server";
import { boundedJson } from "@/server/http/body";
import { requireSameOrigin } from "@/server/http/origin";
import { defineRoute, jsonData } from "@/server/http/route";
import { recordKeySchema, workbenchRecords } from "@/server/workbench/records";
export const GET = defineRoute<{ key: string }>(
  async (_request, { params, requestId }) => {
    const user = await requirePrincipal(["author", "admin"]);
    return jsonData(
      await workbenchRecords().read(
        user.id,
        recordKeySchema.parse((await params).key),
      ),
      requestId,
    );
  },
);
export const PUT = defineRoute<{ key: string }>(
  async (request, { params, requestId }) => {
    requireSameOrigin(request);
    const user = await requirePrincipal(["author", "admin"]);
    const key = recordKeySchema.parse((await params).key);
    const input = z
      .object({ revision: z.number().int().min(0), value: z.unknown() })
      .strict()
      .parse(await boundedJson(request, 8 * 1024 * 1024));
    return jsonData(
      await workbenchRecords().write(user.id, key, input.revision, input.value),
      requestId,
    );
  },
);
