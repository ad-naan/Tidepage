"use client";
import { Github, GitBranch, Sparkles, ArrowUpRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { profileLinks } from "@/shared/config/profile";
import { HanddrawnMark } from "@/shared/ui/HanddrawnMark";
import styles from "./ProfileLinks.module.css";

const icons = { github: Github, gitee: GitBranch, spark: Sparkles };
export function ProfileLinks() {
  const t = useTranslations("home.social");
  return (
    <nav className={styles.links} aria-label={t("label")}>
      {profileLinks.map((item) => {
        const Icon = icons[item.key];
        return (
          <a
            key={item.key}
            href={item.href}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.link}
            aria-label={`${t(`${item.key}.name`)} · ${t(`${item.key}.hint`)}`}
          >
            <Icon
              className={styles.icon}
              size={15}
              strokeWidth={1.55}
              aria-hidden="true"
            />
            <span>{t(`${item.key}.name`)}</span>
            <ArrowUpRight
              className={styles.arrow}
              size={11}
              aria-hidden="true"
            />
            <HanddrawnMark className={styles.mark} />
            <small className={styles.hint} aria-hidden="true">
              {t(`${item.key}.hint`)}
            </small>
          </a>
        );
      })}
    </nav>
  );
}
