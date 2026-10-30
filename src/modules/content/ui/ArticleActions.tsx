"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Copy, Heart } from "lucide-react";
import { useLocalState } from "@/shared/hooks/useLocalState";
import { SpringButton } from "@/shared/ui/primitives";

export function ArticleActions({
  slug,
  title,
}: {
  slug: string;
  title: string;
}) {
  const t = useTranslations("articles");
  const [saved, setSaved] = useLocalState<string[]>("adnaan-articles", []);
  const [message, setMessage] = useState("");
  async function share() {
    try {
      await navigator.clipboard.writeText(`${title}\n${window.location.href}`);
      setMessage(t("copied"));
    } catch {
      setMessage(t("copyFallback"));
    }
  }
  return (
    <div className="article-actions">
      <SpringButton
        className={`button-outline ${saved.includes(slug) ? "liked" : ""}`}
        onClick={() =>
          setSaved((v) =>
            v.includes(slug) ? v.filter((s) => s !== slug) : [...v, slug],
          )
        }
      >
        <Heart
          size={16}
          fill={saved.includes(slug) ? "currentColor" : "none"}
        />
        {saved.includes(slug) ? t("saved") : t("save")}
      </SpringButton>
      <SpringButton className="button-outline" onClick={share}>
        <Copy size={15} />
        {t("share")}
      </SpringButton>
      <span role="status">{message}</span>
    </div>
  );
}
