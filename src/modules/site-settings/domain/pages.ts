import { z } from "zod";

export const pageSectionSchema = z.object({
  title: z.string().max(120),
  paragraphs: z.array(z.string().max(8000)).max(24),
});
export const pageSectionsSchema = z.array(pageSectionSchema).max(20);
export type PageSection = z.infer<typeof pageSectionSchema>;
export type EditablePage = {
  title: string;
  intro: string;
  sections: PageSection[];
};
export type PersonalPage = EditablePage & {
  identity: string;
  personality: string;
  signature: string;
  interests: Array<{ label: string; description: string }>;
};

/** Existing plain text remains readable; the editor writes structured sections. */
export function parsePageSections(
  value: string | undefined,
  fallback: PageSection[] = [],
): PageSection[] {
  if (!value?.trim()) return fallback;
  try {
    const parsed: unknown = JSON.parse(value);
    return pageSectionsSchema.parse(parsed);
  } catch {
    if (value.trim().startsWith("[") || value.trim().startsWith("{"))
      return fallback;
    return [
      {
        title: "",
        paragraphs: value
          .split(/\n\s*\n/)
          .map((p) => p.trim())
          .filter(Boolean),
      },
    ];
  }
}

export function resolvePersonalPage(
  fields: Record<string, string>,
  defaults: PersonalPage,
): PersonalPage {
  return {
    title: fields.aboutTitle?.trim() || defaults.title,
    intro: fields.aboutIntro?.trim() || defaults.intro,
    identity: fields.aboutIdentity?.trim() || defaults.identity,
    personality: fields.aboutPersonality?.trim() || defaults.personality,
    signature: fields.signature?.trim() || defaults.signature,
    sections: parsePageSections(fields.aboutSections, defaults.sections),
    interests: defaults.interests.map((item, i) => ({
      label: fields[`aboutInterest${i + 1}`]?.trim() || item.label,
      description:
        fields[`aboutInterestNote${i + 1}`]?.trim() || item.description,
    })),
  };
}

export function resolveSitePage(
  fields: Record<string, string>,
  defaults: EditablePage,
): EditablePage {
  return {
    title: fields.siteAboutTitle?.trim() || defaults.title,
    intro: fields.siteAboutIntro?.trim() || defaults.intro,
    sections: parsePageSections(fields.siteAboutSections, defaults.sections),
  };
}
