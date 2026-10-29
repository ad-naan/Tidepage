"use client";
import { Link } from "@/shared/i18n/navigation";
export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main id="main-content" className="not-found">
      <h1>这一页暂时没有打开</h1>
      <p>可以重新尝试，或先回到首页。</p>
      <button className="button-outline" onClick={reset}>
        重新尝试
      </button>
      <Link href="/">回到首页</Link>
    </main>
  );
}
