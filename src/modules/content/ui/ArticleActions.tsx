"use client";
import { useState } from "react";
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
  const [saved, setSaved] = useLocalState<string[]>("adnaan-articles", []);
  const [message, setMessage] = useState("");
  async function share() {
    try {
      await navigator.clipboard.writeText(`${title}\n${window.location.href}`);
      setMessage("链接已复制");
    } catch {
      setMessage("请复制浏览器地址栏中的链接");
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
        {saved.includes(slug) ? "已收藏" : "收藏这篇文章"}
      </SpringButton>
      <SpringButton className="button-outline" onClick={share}>
        <Copy size={15} />
        分享文章
      </SpringButton>
      <span role="status">{message}</span>
    </div>
  );
}
