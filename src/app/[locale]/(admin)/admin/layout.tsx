import type { Metadata } from "next";
import { AdminShell } from "@/widgets/admin-shell/AdminShell";
import { CustomScrollbars } from "@/shared/ui/scroll-area/CustomScrollbars";
export const metadata: Metadata = { robots: { index: false, follow: false } };
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <AdminShell>
      {children}
      <CustomScrollbars />
    </AdminShell>
  );
}
