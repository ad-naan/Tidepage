import { z } from "zod";
import { localeSchema } from "@/shared/i18n/schema";

export const journalLimit = 100;
export const journalEntrySchema = z.object({
  id: z.string().min(1).max(160),
  locale: localeSchema,
  kind: z.enum(["bookmark", "quote"]),
  title: z.string().trim().min(1).max(300),
  // Only local reading destinations can be restored from browser storage.
  href: z
    .string()
    .regex(
      /^\/(?:articles\/[a-z0-9]+(?:-[a-z0-9]+)*(?:#section-\d+)?|quotes)$/,
    ),
  text: z.string().max(1000),
  savedAt: z.iso.datetime(),
});
export type JournalEntry = z.infer<typeof journalEntrySchema>;
export type JournalInput = Omit<JournalEntry, "id" | "savedAt" | "locale">;

export function readJournal(raw: string | null): JournalEntry[] {
  if (!raw) return [];
  const envelope = z
    .object({
      version: z.literal(1),
      entries: z.array(journalEntrySchema).max(journalLimit),
    })
    .parse(JSON.parse(raw));
  return envelope.entries;
}

export function keepJournalEntry(entries: JournalEntry[], entry: JournalEntry) {
  const valid = journalEntrySchema.parse(entry);
  const rest = entries.filter((item) => !sameJournalEntry(item, valid));
  if (rest.length >= journalLimit) throw new Error("JOURNAL_FULL");
  return [valid, ...rest];
}

export function sameJournalEntry(a: JournalEntry, b: JournalEntry) {
  return (
    a.locale === b.locale &&
    a.kind === b.kind &&
    (a.kind === "bookmark"
      ? a.href.split("#")[0] === b.href.split("#")[0]
      : a.href.split("#")[0] === b.href.split("#")[0] && a.text === b.text)
  );
}
