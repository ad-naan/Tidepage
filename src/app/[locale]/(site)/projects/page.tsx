import { getLocale, getTranslations } from "next-intl/server";
import { ProjectsView } from "@/modules/content/ui/ProjectsView";
import { getProjects } from "@/modules/content/server";
import { getPageMetadata } from "@/server/seo/metadata";
export const generateMetadata = () => getPageMetadata("/projects");
export default async function Page() {
  const locale = await getLocale();
  const projects = await getProjects(locale);
  return <ProjectsView projects={projects} />;
}
