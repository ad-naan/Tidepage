import { getCurrentPrincipal } from "@/modules/identity/server";
import { getEngagementOverview } from "@/modules/engagement/server/overview";
import { log } from "@/server/observability/logger";
import { DashboardView } from "@/modules/dashboard/ui/DashboardView";
import { EngagementOverviewView } from "@/modules/dashboard/ui/EngagementOverviewView";

export default async function Page() {
  const principal = await getCurrentPrincipal();
  if (!principal || principal.role === "reader") return null;
  const overview = await getEngagementOverview(principal).catch(() => {
    log("error", "dashboard.engagement_read_failed");
    return null;
  });
  return (
    <DashboardView siteWide={principal.role === "admin"}>
      <EngagementOverviewView
        overview={overview}
        siteWide={principal.role === "admin"}
      />
    </DashboardView>
  );
}
