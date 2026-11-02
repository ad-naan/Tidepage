"use client";
import { useSyncExternalStore } from "react";
import { retainRealtime } from "@/shared/realtime/client";
import {
  offlineSnapshot,
  presenceSnapshotSchema,
  type PresenceSnapshot,
} from "@/shared/realtime/protocol";

type State = {
  snapshot: PresenceSnapshot;
  connection: "unavailable" | "connecting" | "connected" | "offline";
};
const initial: State = {
  snapshot: offlineSnapshot(),
  connection: "unavailable",
};
let state = initial;
const listeners = new Set<() => void>();
let stop: (() => void) | undefined;
const notify = () => {
  for (const listener of listeners) listener();
};
function start() {
  const retained = retainRealtime();
  if (!retained) return;
  const { socket } = retained;
  let expiry: ReturnType<typeof setTimeout> | undefined;
  let epoch = 0;
  const accept = (raw: unknown) => {
    const parsed = presenceSnapshotSchema.safeParse(raw);
    if (!parsed.success) return;
    // Ignore delayed acknowledgements or snapshots that predate a newer update.
    if (parsed.data.revision < state.snapshot.revision) return;
    clearTimeout(expiry);
    const snapshot =
      parsed.data.expiresAt > Date.now()
        ? parsed.data
        : offlineSnapshot(parsed.data.revision);
    state = { snapshot, connection: "connected" };
    notify();
    if (snapshot.expiresAt)
      expiry = setTimeout(
        () => {
          state = { ...state, snapshot: offlineSnapshot(snapshot.revision) };
          notify();
        },
        Math.min(snapshot.expiresAt - Date.now(), 80_000),
      );
  };
  const connect = () => {
    const requestEpoch = ++epoch;
    // Gateway restarts may reset a development-only in-memory revision counter.
    state = { snapshot: offlineSnapshot(), connection: "connecting" };
    notify();
    socket
      .timeout(5000)
      .emit(
        "author:read",
        (error: Error | null, snapshot: PresenceSnapshot) => {
          if (requestEpoch !== epoch || !socket.connected) return;
          if (error && state.connection === "connecting") {
            state = { snapshot: offlineSnapshot(), connection: "offline" };
            notify();
            return;
          }
          if (error) return;
          accept(snapshot);
        },
      );
  };
  const disconnect = () => {
    ++epoch;
    clearTimeout(expiry);
    state = { snapshot: offlineSnapshot(), connection: "offline" };
    notify();
  };
  socket.on("connect", connect);
  socket.on("author:snapshot", accept);
  socket.on("disconnect", disconnect);
  socket.on("connect_error", disconnect);
  state = { snapshot: offlineSnapshot(), connection: "connecting" };
  notify();
  if (socket.connected) connect();
  else socket.connect();
  stop = () => {
    ++epoch;
    clearTimeout(expiry);
    socket.off("connect", connect);
    socket.off("author:snapshot", accept);
    socket.off("disconnect", disconnect);
    socket.off("connect_error", disconnect);
    retained.release();
    state = initial;
  };
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) start();
  return () => {
    listeners.delete(listener);
    if (!listeners.size) {
      stop?.();
      stop = undefined;
    }
  };
}
export function useAuthorPresence() {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => initial,
  );
}
