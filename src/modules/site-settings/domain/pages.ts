import { z } from "zod";
import {
  isEditorDocument,
  type EditorNode,
} from "@/shared/contracts/rich-text";

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
  body?: EditorNode;
};

export function sectionsDocument(sections: PageSection[]): EditorNode {
  return {
    type: "doc",
    content: sections.flatMap((section) => [
      ...(section.title
        ? [
            {
              type: "heading",
              attrs: { level: 2 },
              content: [{ type: "text", text: section.title }],
            },
          ]
        : []),
      ...section.paragraphs.map((text) => ({
        type: "paragraph",
        content: text ? [{ type: "text", text }] : [],
      })),
    ]),
  };
}
export function parsePageDocument(
  value: string | undefined,
  sections: PageSection[],
): EditorNode {
  try {
    const parsed: unknown = JSON.parse(value || "null");
    if (isEditorDocument(parsed)) return parsed;
  } catch {
    /* Legacy sections remain readable. */
  }
  return sectionsDocument(sections);
}
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
  const sections = parsePageSections(fields.aboutSections, defaults.sections);
  return {
    title: fields.aboutTitle?.trim() || defaults.title,
    intro: fields.aboutIntro?.trim() || defaults.intro,
    identity: fields.aboutIdentity?.trim() || defaults.identity,
    personality: fields.aboutPersonality?.trim() || defaults.personality,
    signature: fields.signature?.trim() || defaults.signature,
    sections,
    body: parsePageDocument(fields.aboutBody, sections),
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
  const sections = parsePageSections(
    fields.siteAboutSections,
    defaults.sections,
  );
  return {
    title: fields.siteAboutTitle?.trim() || defaults.title,
    intro: fields.siteAboutIntro?.trim() || defaults.intro,
    sections,
    body: parsePageDocument(fields.siteAboutBody, sections),
  };
}
