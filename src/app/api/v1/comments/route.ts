import { requirePrincipal } from "@/modules/identity/server";
import {
  discussionStore,
  requireDiscussionTarget,
} from "@/modules/engagement/server";
import { createDiscussionRoutes } from "@/modules/engagement/server/http";

const routes = createDiscussionRoutes({
  store: discussionStore,
  requireTarget: requireDiscussionTarget,
  authorize: () => requirePrincipal(),
});
export const GET = routes.list;
export const POST = routes.create;
