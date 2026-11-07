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
  name = profile.name,
}: {
  size?: SignatureSize;
  mark?: boolean;
  className?: string;
  name?: string;
}) {
  return (
    <Signature
      size={size}
      className={`${styles.name} ${mark ? styles.marked : ""} ${className}`}
    >
      {name}
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

const escapedName = profile.name.replace(/[.*+?^$\{\}()|[\]\\]/g, "\\$&");
const authorNamePattern = new RegExp(`(${escapedName})`, "gi");
export function AuthorNameText({ text }: { text: string }) {
  return (
    <>
      {text.split(authorNamePattern).map((part, index) => (
        <Fragment key={index}>
          {part.toLowerCase() === profile.name.toLowerCase() ? (
            <AuthorSignature size="inline" />
          ) : (
            part
          )}
        </Fragment>
      ))}
    </>
  );
}
