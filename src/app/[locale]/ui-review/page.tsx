"use client";
// Temporary local visual QA fixture; removed before delivery.
import { useState } from "react";
import { IdentityProvider, LoginTrigger } from "@/modules/identity/ui/IdentityProvider";
import { CommentItem } from "@/modules/engagement/ui/CommentItem";
import { ExternalLinkPreview } from "@/shared/ui/link/ExternalLinkPreview";
import { ExternalLink } from "@/shared/ui/link/Anchor";
import { Button } from "@/shared/ui/button/Button";
import { ProgressiveList } from "@/shared/ui/loading/ProgressiveList";
import { Dialog } from "@/shared/ui/dialog/Dialog";

export default function Review() {
  const [account, setAccount] = useState(true);
  const [reply, setReply] = useState("");
  const [dialog, setDialog] = useState(false);
  const base = { author: "adnaan", createdAt: "2026-11-06T10:00:00.000Z", parentId: null, replyTo: null };
  return <IdentityProvider key={String(account)} principal={account ? { id: "visual-fixture", displayName: "adnaan", role: "author" } : null} providers={["github"]}>
    <ExternalLinkPreview />
    <main style={{ maxWidth: 760, padding: 24, margin: "40px auto" }}>
      <Button onClick={() => setAccount(!account)}>切换登录展示</Button><LoginTrigger />
      <Button onClick={() => setDialog(true)}>查看弹窗中的链接</Button>
      {dialog && <Dialog title="链接测试" onClose={() => setDialog(false)}><ExternalLink href="https://example.com/dialog" preview={{title:"弹窗内的参考链接",description:"检查浮层不会被弹窗遮挡。"}}>弹窗参考链接</ExternalLink></Dialog>}
      <h2>评论排版预览</h2>
      <CommentItem item={{ ...base, id: "one", body: "留一点阅读时的想法，也分享一份参考资料。", document: {type:"doc",content:[{type:"paragraph",content:[{type:"text",text:"留一点阅读时的想法，也分享一份参考资料。"}]},{type:"paragraph",content:[{type:"text",text:"查看阅读参考",marks:[{type:"link",attrs:{href:"https://example.com/reading"}}]}]}]} }} nested={false} onReply={(item) => setReply(item.author)} />
      <CommentItem item={{ ...base, author: "Reader", id: "two", parentId: "one", replyTo: "adnaan", body: "是的，把阅读和讨论留在同一个地方。" }} nested onReply={(item) => setReply(item.author)} />
      <CommentItem item={{ ...base, author: "Long reader", id: "three", body: "这是一段较长的讨论。把内容排得清楚，才能让阅读更轻松，也让回复有明确的层级。".repeat(28) }} nested={false} onReply={(item) => setReply(item.author)} />
      {reply && <p>回复 {reply}</p>}
      <ExternalLink href="https://example.com/reference" preview={{title:"阅读参考", description:"这是用于检查卡片排版的本地预览资料。",siteName:"Example"}}>带预览资料的外链</ExternalLink>
      <ProgressiveList items={Array.from({length: 30}, (_,i) => i + 1)}>{(item) => <p key={item}>条目 {item}</p>}</ProgressiveList>
    </main>
  </IdentityProvider>;
}
