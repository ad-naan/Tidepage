import type { Metadata } from "next";
import { CoastalExperience } from "@/modules/world/ui/CoastalExperience";

export const metadata: Metadata = {
  title: "海岸探索",
  description: "驾船探索光阴海岸，寻找灯芯，发现星光下的隐秘海湾。",
  robots: { index: false, follow: true },
};

export default function ExplorePage() {
  return <CoastalExperience />;
}
