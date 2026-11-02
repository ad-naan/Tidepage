"use client";
import { io, type Socket } from "socket.io-client";
import type { ClientEvents, ServerEvents } from "./protocol";

type RealtimeSocket = Socket<ServerEvents, ClientEvents>;
let socket: RealtimeSocket | undefined;
let consumers = 0;
/** One transport per browser tab, shared by presence and future realtime modules. */
export function retainRealtime(): {
  socket: RealtimeSocket;
  release: () => void;
} | null {
  const endpoint = process.env.NEXT_PUBLIC_REALTIME_URL;
  if (!endpoint) return null;
  try {
    const url = new URL(endpoint);
    if (
      !/^https?:$/.test(url.protocol) ||
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      url.pathname !== "/"
    )
      return null;
    if (window.location.protocol === "https:" && url.protocol !== "https:")
      return null;
  } catch {
    return null;
  }
  socket ??= io(endpoint, {
    autoConnect: false,
    transports: ["websocket"],
    auth: { version: 1, role: "reader" },
    timeout: 8000,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 30_000,
    randomizationFactor: 0.5,
  });
  const current = socket;
  consumers++;
  let active = true;
  // Callers attach handlers before connecting, including synchronous test transports.
  return {
    socket: current,
    release: () => {
      if (!active) return;
      active = false;
      if (--consumers === 0) {
        current.disconnect();
        socket = undefined;
      }
    },
  };
}
