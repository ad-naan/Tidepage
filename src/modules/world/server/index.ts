import "server-only";
import { getEnv } from "@/server/config/env";
import { requirePrincipal } from "@/modules/identity/server";
import { createCoastRoutes } from "./http";
import { coastMemoryStore } from "./memories";

export const coastRoutes = createCoastRoutes({
  authorize: () => requirePrincipal(),
  policy: () => ({
    secret: getEnv().REALTIME_AUTHOR_TOKEN,
    hostId: getEnv().ADMIN_USER_ID,
  }),
  store: () => coastMemoryStore(),
});
