"use client";
import { LoadingSkeleton } from "@/shared/ui/loading/LoadingSkeleton";
import { useNavigationPending } from "@/shared/ui/navigation/NavigationFeedback";
export function AdminLoading() {
  useNavigationPending(true);
  return (
    <div data-route-loading>
      <LoadingSkeleton />
    </div>
  );
}
