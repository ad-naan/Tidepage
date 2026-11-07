"use client";
import { useTranslations } from "next-intl";
import { Button } from "@/shared/ui/button/Button";
import { Dialog } from "@/shared/ui/dialog/Dialog";
import styles from "./admin.module.css";

export function EditorialDeleteDialog({
  name,
  busy,
  onClose,
  onDelete,
  draftOnly = false,
}: {
  name: string;
  busy: boolean;
  onClose: () => void;
  onDelete: () => void;
  draftOnly?: boolean;
}) {
  const t = useTranslations("admin");
  return (
    <Dialog
      title={t("editorialList.deleteTitle")}
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <p>
        {t(draftOnly ? "crud.deleteHelp" : "editorialList.deleteHelp", {
          name,
        })}
      </p>
      <div className={styles.actions}>
        <Button variant="quiet" disabled={busy} onClick={onClose}>
          {t("crud.cancel")}
        </Button>
        <Button variant="primary" busy={busy} onClick={onDelete}>
          {t("editorialList.delete")}
        </Button>
      </div>
    </Dialog>
  );
}
