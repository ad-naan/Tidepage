"use client";
import { RouteFallback } from "@/modules/site-feedback/ui/RouteFallback";
export default function ErrorPage({
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  return <RouteFallback kind="error" onRetry={retry} />;
}
