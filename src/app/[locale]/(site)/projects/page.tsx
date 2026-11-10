import { getLocale } from "next-intl/server";
import { ProjectsView } from "@/modules/content/ui/projects/ProjectsView";
import { getProjects } from "@/modules/content/server";
import { getReadingImageDimensions } from "@/modules/content/server/reading-image-dimensions";
import { getPageMetadata } from "@/server/seo/metadata";
export const generateMetadata = () => getPageMetadata("/projects");
export default async function Page() {
  const locale = await getLocale();
  const projects = await getProjects(locale);
  const imageDimensions = await getReadingImageDimensions(
    projects.map((project) => project.body),
  );
  return <ProjectsView projects={projects} imageDimensions={imageDimensions} />;
}
