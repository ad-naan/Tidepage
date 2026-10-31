"use client";
import { useNotice } from "@/shared/ui/feedback/NoticeProvider";
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
  const { notify } = useNotice();
  const feedback = useTranslations("feedback");
  async function share() {
    try {
      await navigator.clipboard.writeText(`${title}\n${window.location.href}`);
      notify({ title: t("copied"), tone: "success" });
    } catch {
      notify({
        title: feedback("copyFailed"),
        detail: t("copyFallback"),
        tone: "error",
        duration: 6500,
      });
    }
  }
  return (
    <div className="article-actions">
      <SpringButton
        className={`button-outline ${saved.includes(slug) ? "liked" : ""}`}
        onClick={() => {
          const removing = saved.includes(slug);
          setSaved((value) =>
            removing ? value.filter((item) => item !== slug) : [...value, slug],
          );
          notify({
            title: feedback(removing ? "removed" : "saved"),
            tone: "success",
          });
        }}
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
    </div>
  );
}
