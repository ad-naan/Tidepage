import { SiteSettingsView } from "@/modules/site-settings/ui/SiteSettingsView";
import { getPageEditorDefaults } from "@/modules/site-settings/server";
import { isEditorialAgentConfigured } from "@/modules/ai/server";
export default async function Page() {
  return (
    <SiteSettingsView
      pageDefaults={await getPageEditorDefaults()}
      aiEnabled={isEditorialAgentConfigured()}
    />
  );
}
