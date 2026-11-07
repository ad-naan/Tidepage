"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { Button } from "@/shared/ui/button/Button";
import { HarborView } from "./HarborView";
import styles from "./CoastalSpaceView.module.css";

const Voyage = dynamic(() =>
  import("./CoastalExperience").then((module) => module.CoastalExperience),
);

export function CoastalSpaceView({
  guideEnabled = false,
}: {
  guideEnabled?: boolean;
}) {
  const [voyage, setVoyage] = useState(false);
  const t = useTranslations("world.harbor");
  if (!voyage)
    return (
      <HarborView
        onVoyage={() => setVoyage(true)}
        guideEnabled={guideEnabled}
      />
    );
  return (
    <>
      <Voyage />
      <Button className={styles.return} onClick={() => setVoyage(false)}>
        {t("return")}
      </Button>
    </>
  );
}
