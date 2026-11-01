"use client";
import { LoadingSkeleton } from "@/shared/ui/loading/LoadingSkeleton";
export function AdminLoading() {
  return (
    <div data-route-loading>
      <LoadingSkeleton />
    </div>
  );
}
