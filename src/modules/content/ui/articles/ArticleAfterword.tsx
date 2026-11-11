import { useTranslations } from "next-intl";
import { StationeryDrawing } from "@/shared/ui/illustration/StationeryDrawing";
import { PencilLine } from "@/shared/ui/drawing/CoastalMarks";
import { Disclosure } from "@/shared/ui/disclosure/Disclosure";
import { DateTime } from "@/shared/ui/typography/DateTime";
import type { Afterword } from "@/modules/content/domain/afterword";
import styles from "./ArticleAfterword.module.css";

export function ArticleAfterword({ value }: { value?: Afterword }) {
  const t = useTranslations("articles.afterword");
  if (!value || (!value.note.trim() && !value.updates.length)) return null;
  const updates = value.updates
    .filter((update) => update.text.trim())
    .sort((a, b) => b.date.localeCompare(a.date));
  if (!value.note.trim() && !updates.length) return null;
  return (
    <aside className={styles.afterword} aria-label={t("title")}>
      <svg
        className={styles.bracket}
        viewBox="0 0 28 160"
        preserveAspectRatio="none"
        fill="none"
        aria-hidden="true"
      >
        <path d="M22 4 9 6q-5 72 1 148l13 2M6 18q-2 65 1 121" />
      </svg>
      <div className={styles.label}>
        <StationeryDrawing kind="pencil" />
        {t("title")}
      </div>
      {value.note.trim() && <p className={styles.note}>{value.note}</p>}
      {updates.length > 0 && (
        <Disclosure
          summary={
            <span>
              {t("updates", { count: updates.length })}
              <span className={styles.latest}>
                <DateTime value={updates[0].date} />
              </span>
            </span>
          }
        >
          <ol className={styles.updates}>
            {updates.map((update, index) => (
              <li key={`${update.date}-${index}`}>
                <PencilLine />
                <DateTime value={update.date} />
                <p>{update.text}</p>
              </li>
            ))}
          </ol>
        </Disclosure>
      )}
    </aside>
  );
}
