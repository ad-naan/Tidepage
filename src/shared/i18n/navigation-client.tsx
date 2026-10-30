"use client";
import {
  forwardRef,
  useEffect,
  useMemo,
  useRef,
  useTransition,
  type ComponentProps,
} from "react";
import { navigation } from "./navigation-core";
import { useNavigationFeedback } from "@/shared/ui/navigation/NavigationFeedback";

export const Link = forwardRef<
  HTMLAnchorElement,
  ComponentProps<typeof navigation.Link>
>(function Link({ onNavigate, ...props }, ref) {
  const feedback = useNavigationFeedback();
  const anchor = useRef<HTMLAnchorElement | null>(null);
  return (
    <navigation.Link
      {...props}
      ref={(element) => {
        anchor.current = element;
        if (typeof ref === "function") ref(element);
        else if (ref) ref.current = element;
      }}
      onNavigate={(event) => {
        let cancelled = false;
        onNavigate?.({
          preventDefault: () => {
            cancelled = true;
            event.preventDefault();
          },
        });
        if (cancelled) return;
        if (anchor.current) {
          const destination = new URL(anchor.current.href);
          if (
            destination.pathname === location.pathname &&
            destination.search === location.search
          )
            return;
        }
        feedback?.begin();
      }}
    />
  );
});

/** Programmatic navigation shares the same feedback lifecycle as Link. */
export function useRouter() {
  const router = navigation.useRouter();
  const feedback = useNavigationFeedback();
  const begin = feedback?.begin,
    settle = feedback?.settle;
  const [pending, transition] = useTransition();
  const requested = useRef(false);
  useEffect(() => {
    if (!pending && requested.current) {
      requested.current = false;
      settle?.();
    }
  }, [pending, settle]);
  return useMemo(() => {
    function run(action: () => void) {
      requested.current = true;
      begin?.();
      transition(action);
    }
    return {
      ...router,
      push: (...args: Parameters<typeof router.push>) =>
        run(() => router.push(...args)),
      replace: (...args: Parameters<typeof router.replace>) =>
        run(() => router.replace(...args)),
      back: () => run(() => router.back()),
      forward: () => run(() => router.forward()),
      refresh: () => run(() => router.refresh()),
    };
  }, [router, begin]);
}
