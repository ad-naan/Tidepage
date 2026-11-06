"use client";
import { Bookmark, Heart } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/shared/ui/button/Button";
import {
  targetKey,
  type EngagementTarget,
} from "@/modules/engagement/domain/target";
import type { InteractionKind } from "@/modules/engagement/domain/interactions";
import { EngagementProvider, useEngagement } from "./EngagementProvider";
import styles from "./EngagementActions.module.css";

export function InteractionButton({
  target,
  kind,
  iconOnly = false,
  showCount = !iconOnly,
}: {
  target: EngagementTarget;
  kind: InteractionKind;
  iconOnly?: boolean;
  showCount?: boolean;
}) {
  const t = useTranslations("engagement");
  const { states, pending, loading, change } = useEngagement();
  const key = targetKey(target);
  const state = states[key];
  const active = kind === "like" ? !!state?.liked : !!state?.saved;
  const Icon = kind === "like" ? Heart : Bookmark;
  const label = t(
    kind === "like" ? (active ? "liked" : "like") : active ? "saved" : "save",
  );
  return (
    <Button
      className={`${styles.action} ${iconOnly ? styles.iconOnly : ""}`}
      aria-label={label}
      title={label}
      data-count={(showCount && kind === "like") || undefined}
      aria-pressed={active}
      disabled={loading || !state}
      busy={pending.includes(key)}
      onClick={() => void change(target, kind)}
    >
      <Icon size={18} fill={active ? "currentColor" : "none"} />
      {!iconOnly && (
        <>
          <span>{label}</span>
        </>
      )}
      {showCount && kind === "like" && state && (
        <span className={styles.count}>{state.likeCount}</span>
      )}
    </Button>
  );
}
export function EngagementStatus() {
  const t = useTranslations("engagement");
  const { error, reload } = useEngagement();
  return error ? (
    <div className={styles.error} role="status">
      <span>{t("loadFailed")}</span>
      <Button size="sm" variant="quiet" onClick={reload}>
        {t("retry")}
      </Button>
    </div>
  ) : null;
}
export function EngagementActions({ target }: { target: EngagementTarget }) {
  return (
    <div className={styles.root}>
      <div className={styles.actions}>
        <InteractionButton target={target} kind="like" />
        <InteractionButton target={target} kind="save" />
      </div>
      <EngagementStatus />
    </div>
  );
}
export function ContentEngagementActions({
  target,
}: {
  target: EngagementTarget;
}) {
  return (
    <EngagementProvider targets={[target]}>
      <EngagementActions target={target} />
    </EngagementProvider>
  );
}
