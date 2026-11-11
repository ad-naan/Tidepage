"use client";
import { useNotice } from "@/shared/ui/feedback/NoticeProvider";
import { useTranslations } from "next-intl";
import { Copy, Share2 } from "lucide-react";
import { EngagementActions } from "@/modules/engagement/ui/EngagementActions";
import { Button } from "@/shared/ui/button/Button";
import { ArticleBookmark } from "./ArticleBookmark";
import { JournalLink } from "@/modules/journal/ui/Journal";

export function ArticleShareButton({
  title,
  iconOnly = false,
  className = "",
}: {
  title: string;
  iconOnly?: boolean;
  className?: string;
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
    <Button
      className={`${iconOnly ? "" : "button-outline"} ${className}`}
      aria-label={t("share")}
      title={t("share")}
      onClick={share}
    >
      {iconOnly ? (
        <Share2 size={18} />
      ) : (
        <>
          <Copy size={15} />
          {t("share")}
        </>
      )}
    </Button>
  );
}
export function ArticleActions({
  slug,
  title,
}: {
  slug: string;
  title: string;
}) {
  return (
    <div className="article-actions">
      <EngagementActions target={{ type: "article", id: slug }} />
      <ArticleShareButton title={title} />
      <ArticleBookmark slug={slug} title={title} />
      <JournalLink />
    </div>
  );
}
