"use client";
import { useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";
import { useNotice } from "@/shared/ui/feedback/NoticeProvider";
import { useTranslations } from "next-intl";
export function CodeCopy({ code }: { code: string }) {
  const t = useTranslations("articleBlocks");
  const { notify } = useNotice();
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
          notify({ title: t("copied"), tone: "success" });
        } catch {
          setState("failed");
          notify({ title: t("failed"), tone: "error", duration: 6500 });
        }
        timer.current = setTimeout(() => setState("copy"), 1800);
      }}
    >
      {state === "copied" ? <Check size={13} /> : <Copy size={13} />}
      <span>{t(state)}</span>
    </button>
  );
}
