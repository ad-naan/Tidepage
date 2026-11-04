"use client";
import { useNotice } from "@/shared/ui/feedback/NoticeProvider";
import { useTranslations } from "next-intl";
import { Copy } from "lucide-react";
import { ContentEngagementActions } from "@/modules/engagement/ui/EngagementActions";
import { Button } from "@/shared/ui/button/Button";

export function ArticleActions({
  slug,
  title,
}: {
  slug: string;
  title: string;
}) {
  const t = useTranslations("articles");
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
      <ContentEngagementActions target={{ type: "article", id: slug }} />
      <Button className="button-outline" onClick={share}>
        <Copy size={15} />
        {t("share")}
      </Button>
    </div>
  );
}
