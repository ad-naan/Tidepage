import { getLocale } from "next-intl/server";
import { ProjectsView } from "@/modules/content/ui/projects/ProjectsView";
import { getProjects } from "@/modules/content/server";
import { getReadingImageDimensions } from "@/modules/content/server/reading-image-dimensions";
import { getPageMetadata } from "@/server/seo/metadata";
export const generateMetadata = () => getPageMetadata("/projects");
export default async function Page({
  searchParams,
}: PageProps<"/[locale]/projects">) {
  const locale = await getLocale();
  const { open } = await searchParams;
  const projects = await getProjects(locale);
  const imageDimensions = await getReadingImageDimensions(
    projects.map((project) => project.body),
  );
  const initialId = typeof open === "string" ? open : undefined;
  return (
    <ProjectsView
      key={initialId}
      projects={projects}
      imageDimensions={imageDimensions}
      initialId={initialId}
    />
  );
}
