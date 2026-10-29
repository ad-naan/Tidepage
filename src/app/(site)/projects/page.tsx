import { ProjectsView } from "@/modules/content/ui/ProjectsView";
import { getProjects } from "@/modules/content/server";
import { pageMetadata } from "@/server/seo/metadata";
export const metadata = pageMetadata(
  "/projects",
  "项目",
  "独立开发、产品与交互实验。",
);
export default async function Page() {
  const projects = await getProjects();
  return <ProjectsView projects={projects} />;
}
