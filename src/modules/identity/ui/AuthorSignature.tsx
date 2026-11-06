import { Fragment } from "react";
import { profile } from "@/shared/config/profile";
import {
  Signature,
  type SignatureSize,
} from "@/shared/ui/typography/Signature";
import styles from "./AuthorSignature.module.css";

export function AuthorSignature({
  size = "md",
  mark = false,
  className = "",
}: {
  size?: SignatureSize;
  mark?: boolean;
  className?: string;
}) {
  return (
    <Signature
      size={size}
      className={`${styles.name} ${mark ? styles.marked : ""} ${className}`}
    >
      {profile.name}
      {mark && (
        <svg
          className={styles.arrow}
          viewBox="0 0 22 16"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="m2 6 8 4-4-7 13 6-5 2"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </Signature>
  );
}

export function AuthorNameText({ text }: { text: string }) {
  return (
    <>
      {text.split(/(adnaan)/gi).map((part, index) => (
        <Fragment key={index}>
          {part.toLowerCase() === profile.name ? (
            <AuthorSignature size="inline" />
          ) : (
            part
          )}
        </Fragment>
      ))}
    </>
  );
}
