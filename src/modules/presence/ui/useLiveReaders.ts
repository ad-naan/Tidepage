"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale } from "next-intl";
import { usePathname } from "@/shared/i18n/navigation";
import { retainRealtime } from "@/shared/realtime/client";
import {
  readerPageSchema,
  readerSnapshotInterval,
  readerSnapshotSchema,
  type ReaderPage,
  type ReaderSnapshot,
} from "@/shared/realtime/readers";

type ReaderState =
  | { status: "unavailable" | "connecting" | "offline"; snapshot: null }
  | { status: "connected"; snapshot: ReaderSnapshot };

export function useLiveReaders() {
  const locale = useLocale();
  const pathname = usePathname();
  const page = useRef<ReaderPage | null>(null);
  const reportPage = useRef<() => void>(undefined);
  const [state, setState] = useState<ReaderState>({
    status: "unavailable",
    snapshot: null,
  });

  useEffect(() => {
    const result = readerPageSchema.safeParse({ locale, path: pathname });
    page.current = result.success ? result.data : null;
    reportPage.current?.();
  }, [locale, pathname]);

  useEffect(() => {
    const retained = retainRealtime();
    if (!retained) return;
    const { socket } = retained;
    let expiry: ReturnType<typeof setTimeout> | undefined;

    function offline() {
      clearTimeout(expiry);
      setState({ status: "offline", snapshot: null });
    }
    function expectSnapshot() {
      clearTimeout(expiry);
      expiry = setTimeout(offline, readerSnapshotInterval * 4);
    }
    function report() {
      if (socket.connected)
        socket.emit("readers:page", document.hidden ? null : page.current);
    }
    function connect() {
      setState({ status: "connecting", snapshot: null });
      expectSnapshot();
      report();
    }
    function accept(raw: unknown) {
      const result = readerSnapshotSchema.safeParse(raw);
      if (!result.success) {
        offline();
        return;
      }
      expectSnapshot();
      setState({ status: "connected", snapshot: result.data });
    }

    reportPage.current = report;
    document.addEventListener("visibilitychange", report);
    socket.on("connect", connect);
    socket.on("connect_error", offline);
    socket.on("disconnect", offline);
    socket.on("readers:snapshot", accept);
    if (socket.connected) connect();
    else {
      setState({ status: "connecting", snapshot: null });
      socket.connect();
    }
    return () => {
      clearTimeout(expiry);
      if (socket.connected) socket.emit("readers:page", null);
      reportPage.current = undefined;
      document.removeEventListener("visibilitychange", report);
      socket.off("connect", connect);
      socket.off("connect_error", offline);
      socket.off("disconnect", offline);
      socket.off("readers:snapshot", accept);
      retained.release();
    };
  }, []);

  return state;
}
