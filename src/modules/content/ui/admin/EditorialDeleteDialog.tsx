"use client";
import { useTranslations } from "next-intl";
import { ConfirmDialog } from "@/shared/ui/dialog/ConfirmDialog";

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
    <ConfirmDialog
      title={t("editorialList.deleteTitle")}
      description={t(
        draftOnly ? "crud.deleteHelp" : "editorialList.deleteHelp",
        { name },
      )}
      cancelLabel={t("crud.cancel")}
      confirmLabel={t("editorialList.delete")}
      danger
      busy={busy}
      onClose={onClose}
      onConfirm={onDelete}
    />
  );
}
