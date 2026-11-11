"use client";
import { useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Expand } from "lucide-react";
import { Button } from "@/shared/ui/button/Button";
import { Dialog } from "@/shared/ui/dialog/Dialog";
import styles from "./DiagramSurface.module.css";

export function DiagramSurface({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const t = useTranslations("diagrams");
  const [open, setOpen] = useState(false);
  return (
    <>
      <div className={styles.fit}>{children}</div>
      <div className={styles.tools}>
        <Button size="sm" variant="quiet" onClick={() => setOpen(true)}>
          <Expand size={14} />
          {t("enlarge")}
        </Button>
      </div>
      {open && (
        <Dialog title={title} wide onClose={() => setOpen(false)}>
          <div
            className={styles.full}
            data-custom-scroll={title}
            tabIndex={0}
            role="region"
            aria-label={title}
          >
            {children}
          </div>
        </Dialog>
      )}
    </>
  );
}
