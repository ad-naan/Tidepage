"use client";
import { useEffect, useRef, useState } from "react";

/** Activate once, including inside scrollable dialogs; never unmount content on scroll. */
export function useNearViewport<T extends HTMLElement>(margin = "400px") {
  const ref = useRef<T>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (ready) return;
    if (!ref.current || !("IntersectionObserver" in window)) {
      setReady(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setReady(true);
          observer.disconnect();
        }
      },
      { rootMargin: margin },
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [ready, margin]);
  return { ref, ready, activate: () => setReady(true) };
}
