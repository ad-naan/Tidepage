import { notFound } from "next/navigation";
import { z } from "zod";
import { getCurrentPrincipal } from "@/modules/identity/server";
import { getReaderDirectory } from "@/modules/identity/server/readers";
import { getEngagementOverview } from "@/modules/engagement/server/overview";
import { ReaderDirectoryView } from "@/modules/identity/ui/ReaderDirectoryView";
import { log } from "@/server/observability/logger";

export default async function Page({
  searchParams,
}: PageProps<"/[locale]/admin/readers">) {
  const principal = await getCurrentPrincipal();
  if (!principal || principal.role === "reader") return null;
  if (principal.role !== "admin") notFound();
  const input = await searchParams;
  const query = typeof input.q === "string" ? input.q.trim().slice(0, 100) : "";
  const candidate = Number(input.page);
  const page = Number.isSafeInteger(candidate) && candidate > 0 ? candidate : 1;
  const readerId = z.uuid().safeParse(input.reader).data;
  const directory = await getReaderDirectory(principal, {
    query,
    page,
    readerId,
  }).catch(() => {
    log("error", "dashboard.reader_directory_read_failed");
    return null;
  });
  const engagement = directory?.selected
    ? await getEngagementOverview(
        principal,
        undefined,
        directory.selected.id,
      ).catch(() => {
        log("error", "dashboard.reader_engagement_read_failed");
        return null;
      })
    : null;
  return (
    <ReaderDirectoryView
      directory={directory}
      query={query}
      readerRequested={typeof input.reader === "string"}
      engagement={engagement}
    />
  );
}
