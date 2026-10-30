"use client";
import { useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";
import { useTranslations } from "next-intl";
export function CodeCopy({ code }: { code: string }) {
  const t = useTranslations("articleBlocks");
  const [state, setState] = useState<"copy" | "copied" | "failed">("copy");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  return (
    <button
      type="button"
      aria-label={t(state)}
      onClick={async () => {
        clearTimeout(timer.current);
        try {
          await navigator.clipboard.writeText(code);
          setState("copied");
        } catch {
          setState("failed");
        }
        timer.current = setTimeout(() => setState("copy"), 1800);
      }}
    >
      {state === "copied" ? <Check size={13} /> : <Copy size={13} />}
      <span role="status">{t(state)}</span>
    </button>
  );
}
