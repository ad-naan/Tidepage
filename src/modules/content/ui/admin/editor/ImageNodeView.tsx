"use client";
import { useId, useRef, useState } from "react";
import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { useTranslations } from "next-intl";
import { MoveDiagonal2 } from "lucide-react";
import { Button, IconButton } from "@/shared/ui/button/Button";
import { Input, RangeSlider } from "@/shared/ui/field/Input";
import { Field } from "@/shared/ui/field/Field";
import { FilterTabs } from "@/shared/ui/filter-tabs/FilterTabs";
import { Dialog } from "@/shared/ui/dialog/Dialog";
import { AssetImage } from "@/modules/media/ui/admin/AssetImage";
import { ImageCropDialog } from "@/modules/media/ui/admin/ImageCropDialog";
import { MediaPicker } from "@/modules/media/ui/admin/MediaPicker";
import styles from "./ImageNodeView.module.css";
export function ImageNodeView({
  node,
  editor,
  selected,
  updateAttributes,
  deleteNode,
}: NodeViewProps) {
  const t = useTranslations("admin.image");
  const fieldId = useId();
  const [editing, setEditing] = useState(false);
  const [crop, setCrop] = useState(false);
  const [replace, setReplace] = useState(false);
  const outer = useRef<HTMLDivElement>(null);
  const drag = useRef<{
    x: number;
    width: number;
    parent: number;
    factor: number;
  } | null>(null);
  const width = Number(node.attrs.width) || 100;
  const align = String(node.attrs.align || "center");
  const setWidth = (value: number) =>
    updateAttributes({ width: Math.min(100, Math.max(20, Math.round(value))) });
  return (
    <NodeViewWrapper
      ref={outer}
      className={`${styles.block} ${selected ? styles.selected : ""}`}
      contentEditable={false}
      data-active={selected || editing}
    >
      <figure
        className={styles.figure}
        data-align={align}
        style={{
          width: `${width}%`,
          marginLeft: align === "left" ? 0 : "auto",
          marginRight: align === "right" ? 0 : "auto",
        }}
      >
        {node.attrs.uploading ? (
          <p role="status">{t("uploading")}</p>
        ) : (
          <AssetImage
            id={String(node.attrs.assetId)}
            alt={String(node.attrs.alt || "")}
          />
        )}
        {node.attrs.caption && (
          <figcaption>{String(node.attrs.caption)}</figcaption>
        )}
        {editor.isEditable && !node.attrs.uploading && (
          <IconButton
            aria-label={t("resizeHandle")}
            role="slider"
            aria-valuemin={20}
            aria-valuemax={100}
            aria-valuenow={width}
            className={styles.handle}
            style={{
              right: align === "right" ? "auto" : -8,
              left: align === "right" ? -8 : "auto",
            }}
            pressEffect={false}
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              drag.current = {
                factor: align === "center" ? 2 : align === "right" ? -1 : 1,
                x: e.clientX,
                width,
                parent: outer.current?.clientWidth ?? 1,
              };
              e.currentTarget.setPointerCapture(e.pointerId);
            }}
            onPointerMove={(e) => {
              if (drag.current)
                setWidth(
                  drag.current.width +
                    ((e.clientX - drag.current.x) / drag.current.parent) *
                      100 *
                      drag.current.factor,
                );
            }}
            onPointerUp={() => {
              drag.current = null;
            }}
            onLostPointerCapture={() => {
              drag.current = null;
            }}
            onPointerCancel={() => {
              drag.current = null;
            }}
            onKeyDown={(e) => {
              if (["ArrowLeft", "ArrowRight"].includes(e.key)) {
                e.preventDefault();
                setWidth(width + (e.key === "ArrowRight" ? 5 : -5));
              }
            }}
          >
            <MoveDiagonal2 size={14} />
          </IconButton>
        )}
        {editor.isEditable && !node.attrs.uploading && (
          <div className={styles.toolbar} data-image-tools>
            <Button size="sm" onClick={() => setEditing(!editing)}>
              {t(editing ? "closeSettings" : "settings")}
            </Button>
            <Button size="sm" onClick={() => setCrop(true)}>
              {t("crop")}
            </Button>
            <Button size="sm" onClick={() => setReplace(true)}>
              {t("replace")}
            </Button>
            {node.attrs.originalAssetId && (
              <Button
                size="sm"
                onClick={() =>
                  updateAttributes({
                    assetId: node.attrs.originalAssetId,
                    originalAssetId: "",
                  })
                }
              >
                {t("restore")}
              </Button>
            )}
            <Button size="sm" onClick={deleteNode}>
              {t("remove")}
            </Button>
          </div>
        )}
      </figure>
      {editor.isEditable && !node.attrs.uploading && (
        <>
          {editing && (
            <Dialog title={t("settings")} onClose={() => setEditing(false)}>
              <div className={styles.controls}>
                <div className={styles.width}>
                  <Field id={`${fieldId}-width`} label={t("width")}>
                    <Input
                      type="number"
                      min={20}
                      max={100}
                      value={width}
                      onChange={(e) => setWidth(Number(e.target.value) || 20)}
                    />
                  </Field>
                  <RangeSlider
                    aria-label={t("width")}
                    min={20}
                    max={100}
                    value={width}
                    onChange={(e) => setWidth(Number(e.target.value))}
                  />
                </div>
                <FilterTabs
                  label={t("alignment")}
                  value={align}
                  onChange={(align) => updateAttributes({ align })}
                  options={["left", "center", "right"].map((value) => ({
                    value,
                    label: t(value as "left" | "center" | "right"),
                  }))}
                />
                <Field id={`${fieldId}-alt`} label={t("alt")}>
                  <Input
                    value={String(node.attrs.alt || "")}
                    onChange={(e) => updateAttributes({ alt: e.target.value })}
                  />
                </Field>
                <Field id={`${fieldId}-caption`} label={t("caption")}>
                  <Input
                    value={String(node.attrs.caption || "")}
                    onChange={(e) =>
                      updateAttributes({ caption: e.target.value })
                    }
                  />
                </Field>
              </div>
            </Dialog>
          )}
        </>
      )}
      {crop && (
        <ImageCropDialog
          assetId={String(node.attrs.assetId)}
          onClose={() => setCrop(false)}
          onSave={(asset) => {
            updateAttributes({
              assetId: asset.id,
              originalAssetId: node.attrs.originalAssetId || node.attrs.assetId,
            });
            setCrop(false);
          }}
        />
      )}
      {replace && (
        <Dialog title={t("replace")} wide onClose={() => setReplace(false)}>
          <MediaPicker
            onSelect={(asset, alt) => {
              updateAttributes({ assetId: asset.id, alt, originalAssetId: "" });
              setReplace(false);
            }}
          />
        </Dialog>
      )}
    </NodeViewWrapper>
  );
}
