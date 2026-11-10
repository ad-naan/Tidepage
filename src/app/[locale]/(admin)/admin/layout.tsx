import type { Metadata } from "next";
import { AdminShell } from "@/widgets/admin-shell/AdminShell";
import { CustomScrollbars } from "@/shared/ui/scroll-area/CustomScrollbars";
import {
  getCurrentPrincipal,
  listConfiguredOAuthProviders,
} from "@/modules/identity/server";
import { AuthorLoginView } from "@/modules/identity/ui/AuthorLoginView";
export const metadata: Metadata = { robots: { index: false, follow: false } };
export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const principal = await getCurrentPrincipal();
  if (!principal || !["admin", "author"].includes(principal.role))
    return (
      <AuthorLoginView
        providers={listConfiguredOAuthProviders()}
        principal={principal}
      />
    );
  return (
    <AdminShell isAdmin={principal.role === "admin"}>
      {children}
      <CustomScrollbars />
    </AdminShell>
  );
}
