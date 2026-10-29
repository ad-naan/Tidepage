import Link from "next/link";
import { MiniSketch } from "@/components/Sketch";
export default function NotFound() {
  return (
    <main id="main-content" className="not-found">
      <MiniSketch kind="boat" />
      <div className="eyebrow">404 · A LITTLE DETOUR</div>
      <h1>好像漂到了未知的海域。</h1>
      <p>没关系，沿着来时的路，翻回熟悉的那一页。</p>
      <Link href="/" className="button-outline">
        回到首页 →
      </Link>
    </main>
  );
}
