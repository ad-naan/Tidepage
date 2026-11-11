"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useLocale, useTranslations } from "next-intl";
import { useNotice } from "@/shared/ui/feedback/NoticeProvider";
import {
  keepJournalEntry,
  readJournal,
  type JournalEntry,
  type JournalInput,
} from "@/modules/journal/domain/journal";

const storageKey = "tidepage:journey-journal:v1";
const JournalContext = createContext<{
  entries: JournalEntry[];
  ready: boolean;
  unavailable: boolean;
  keep: (input: JournalInput) => boolean;
  remove: (id: string) => boolean;
} | null>(null);

export function JournalProvider({ children }: { children: ReactNode }) {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [ready, setReady] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const locale = useLocale();
  const t = useTranslations("journal");
  const { notify } = useNotice();
  useEffect(() => {
    function refresh() {
      try {
        setEntries(readJournal(localStorage.getItem(storageKey)));
        setUnavailable(false);
      } catch {
        setUnavailable(true);
      } finally {
        setReady(true);
      }
    }
    function changed(event: StorageEvent) {
      if (event.key === storageKey || event.key === null) refresh();
    }
    refresh();
    window.addEventListener("storage", changed);
    return () => window.removeEventListener("storage", changed);
  }, []);

  function write(change: (current: JournalEntry[]) => JournalEntry[]) {
    try {
      // Read again at action time so another tab's earlier saves are retained.
      const next = change(readJournal(localStorage.getItem(storageKey)));
      localStorage.setItem(
        storageKey,
        JSON.stringify({ version: 1, entries: next }),
      );
      setEntries(next);
      setUnavailable(false);
      return true;
    } catch (error) {
      notify({
        title: t(
          error instanceof Error && error.message === "JOURNAL_FULL"
            ? "full"
            : "failed",
        ),
        detail: t("failureHelp"),
        tone: "error",
      });
      return false;
    }
  }
  function keep(input: JournalInput) {
    const success = write((current) =>
      keepJournalEntry(current, {
        ...input,
        locale,
        id: crypto.randomUUID(),
        savedAt: new Date().toISOString(),
      }),
    );
    return success;
  }
  function remove(id: string) {
    return write((current) => current.filter((entry) => entry.id !== id));
  }
  return (
    <JournalContext.Provider
      value={{
        entries: entries.filter((entry) => entry.locale === locale),
        ready,
        unavailable,
        keep,
        remove,
      }}
    >
      {children}
    </JournalContext.Provider>
  );
}

export function useJournal() {
  const value = useContext(JournalContext);
  if (!value) throw new Error("JOURNAL_PROVIDER_REQUIRED");
  return value;
}
