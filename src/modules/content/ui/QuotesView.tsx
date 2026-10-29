"use client";
import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowUpRight, Check, Copy, Heart, RotateCw } from "lucide-react";
import type { Quote } from "../domain/models";
import { useLocalState } from "@/shared/hooks/useLocalState";
import { MiniSketch } from "@/components/Sketch";
import { PageHeading, SpringButton } from "@/shared/ui/primitives";
import { softSpring } from "@/shared/lib/motion";

export function QuotesView({ quotes }: { quotes: Quote[] }) {
  const [index, setIndex] = useState(0);
  const [saved, setSaved] = useLocalState<number[]>("adnaan-quotes", []);
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  const quote = quotes[index % Math.max(quotes.length, 1)];
  async function copy() {
    try {
      await navigator.clipboard.writeText(`${quote.text}\n—— ${quote.author}`);
      setCopied(true);
      setCopyFailed(false);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopyFailed(true);
    }
  }
  if (!quote)
    return (
      <div className="inner-page">
        <PageHeading
          title="留给下一页的话"
          description="这里的句子还在酝酿。"
        />
      </div>
    );
  return (
    <div className="inner-page quotes-page">
      <PageHeading
        title="留给下一页的话"
        description="写给走过这一段路，也准备重新出发的自己。"
      />
      <div className="quote-stage">
        <span className="quote-index">
          第 {String(index + 1).padStart(2, "0")} 页 /{" "}
          {String(quotes.length).padStart(2, "0")}
        </span>
        <span className="big-quote">“</span>
        <AnimatePresence mode="wait">
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 22, rotate: -1 }}
            animate={{ opacity: 1, y: 0, rotate: 0 }}
            exit={{ opacity: 0, y: -18 }}
            transition={softSpring}
          >
            <blockquote>{quote.text}</blockquote>
            <cite>— {quote.author}</cite>
          </motion.div>
        </AnimatePresence>
        <MiniSketch
          kind={["sun", "tree", "boat", "mountain"][index % 4] as "sun"}
        />
        <div className="quote-actions">
          <SpringButton
            className="button-solid"
            onClick={() => {
              setIndex((v) => (v + 1) % quotes.length);
              setCopied(false);
              setCopyFailed(false);
            }}
          >
            <RotateCw size={16} />
            翻到下一句
          </SpringButton>
          <SpringButton
            className={`icon-button ${saved.includes(index) ? "liked" : ""}`}
            label={saved.includes(index) ? "取消收藏一言" : "收藏这句一言"}
            onClick={() =>
              setSaved((v) =>
                v.includes(index)
                  ? v.filter((n) => n !== index)
                  : [...v, index],
              )
            }
          >
            <Heart
              size={19}
              fill={saved.includes(index) ? "currentColor" : "none"}
            />
          </SpringButton>
          <SpringButton className="icon-button" label="复制一言" onClick={copy}>
            {copied ? <Check size={19} /> : <Copy size={18} />}
          </SpringButton>
        </div>
        <div className="quote-feedback" role="status">
          {copied
            ? "这句话已复制。"
            : copyFailed
              ? "复制暂不可用，可以直接选中文字复制。"
              : saved.includes(index)
                ? "已收藏在这个浏览器里。"
                : "点击爱心，把喜欢的话留在这里。"}
        </div>
      </div>
      {saved.length > 0 && (
        <div className="saved-quotes">
          <h2>
            留在心里的话 <span>{saved.length}</span>
          </h2>
          {saved
            .filter((n) => !!quotes[n])
            .map((n) => (
              <button key={n} onClick={() => setIndex(n)}>
                <span>{quotes[n].text.replace("\n", "")}</span>
                <ArrowUpRight size={16} />
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
