import { SiteSettingsView } from "@/modules/site-settings/ui/SiteSettingsView";
import { readSiteSettingsEditorState } from "@/modules/site-settings/server";
import { isEditorialAgentConfigured } from "@/modules/ai/server";
import { getCurrentPrincipal } from "@/modules/identity/server";

export default async function Page() {
  const principal = await getCurrentPrincipal();
  if (!principal || !["admin", "author"].includes(principal.role)) return null;
  return (
    <SiteSettingsView
      initialSettings={await readSiteSettingsEditorState(principal.id).catch(
        () => null,
      )}
      aiEnabled={isEditorialAgentConfigured()}
      account={principal}
    />
  );
}
