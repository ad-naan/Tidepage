import type { ReactNode } from "react";
import type { Embed } from "@/modules/content/domain/editor-document";
import { ExternalLink } from "@/shared/ui/link/Anchor";

/** Reading metadata supplements the same preview used by all public links. */
export function ReadingLink({ href, children, preview }: {
  href: string;
  children: ReactNode;
  preview?: Embed;
}) {
  return <ExternalLink href={href} preview={preview}>{children}</ExternalLink>;
}
