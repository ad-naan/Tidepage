import {
  getCurrentPrincipal,
  requirePrincipal,
} from "@/modules/identity/server";
import { interactionStore } from "@/modules/engagement/server/interactions";
import { createInteractionRoutes } from "@/modules/engagement/server/interaction-http";
import {
  requireEngagementTarget,
  requireEngagementTargets,
} from "@/modules/engagement/server/targets";
const routes = createInteractionRoutes({
  store: interactionStore,
  currentUser: getCurrentPrincipal,
  authorize: () => requirePrincipal(),
  requireTarget: requireEngagementTarget,
  requireTargets: requireEngagementTargets,
});
export const GET = routes.read;
export const PUT = routes.set;
