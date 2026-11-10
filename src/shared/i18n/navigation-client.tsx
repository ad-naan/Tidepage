"use client";
import { forwardRef, useMemo, useTransition, type ComponentProps } from "react";
import { useLinkStatus } from "next/link";
import { navigation } from "./navigation-core";
import { useNavigationPending } from "@/shared/ui/navigation/NavigationFeedback";
import { isQuietNavigationPath } from "@/shared/config/navigation";

function LinkPending() {
  const { pending } = useLinkStatus();
  useNavigationPending(pending);
  return null;
}

export const Link = forwardRef<
  HTMLAnchorElement,
  ComponentProps<typeof navigation.Link>
>(function Link({ children, ...props }, ref) {
  return (
    <navigation.Link
      {...props}
      scroll={
        props.scroll ??
        (isQuietNavigationPath(typeof props.href === "string" ? props.href : "")
          ? false
          : undefined)
      }
      ref={ref}
    >
      {children}
      <LinkPending />
    </navigation.Link>
  );
});

/** Programmatic navigation shares the same feedback lifecycle as Link. */
export function useRouter() {
  const router = navigation.useRouter();
  const [pending, transition] = useTransition();
  useNavigationPending(pending);
  return useMemo(() => {
    return {
      ...router,
      push: (...args: Parameters<typeof router.push>) =>
        transition(() => router.push(...args)),
      replace: (...args: Parameters<typeof router.replace>) =>
        transition(() => router.replace(...args)),
      refresh: () => transition(() => router.refresh()),
    };
  }, [router, transition]);
}
