"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "@/shared/i18n/navigation";
export function useDisclosure(name: string) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const path = usePathname();
  useEffect(() => setOpen(false), [path]);
  useEffect(() => {
    const outside = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    const escape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        if (ref.current?.contains(document.activeElement))
          ref.current.querySelector("button")?.focus();
      }
    };
    const exclusive = (e: Event) => {
      if ((e as CustomEvent).detail !== name) setOpen(false);
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    window.addEventListener("garden-disclosure", exclusive);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
      window.removeEventListener("garden-disclosure", exclusive);
    };
  }, [name]);
  function toggle() {
    if (!open)
      window.dispatchEvent(
        new CustomEvent("garden-disclosure", { detail: name }),
      );
    setOpen((v) => !v);
  }
  return { open, setOpen, toggle, ref };
}
