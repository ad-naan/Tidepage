"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import { retainRealtime } from "@/shared/realtime/client";
import {
  coastSnapshotSchema,
  type CoastAck,
  type CoastErrorCode,
  type CoastJoinAck,
  type CoastPhoto,
  type CoastSnapshot,
  type CoastReceiptAck,
} from "@/shared/contracts/coast-space";
import type { HarborPlace } from "../domain/coast-harbor";
import { coastMovementInput } from "../domain/coast-movement";
import type { CoastAvatar } from "../domain/coast-avatar";
import type { HarborControls } from "../runtime/createHarborScene";

type Phase =
  | "alone"
  | "connecting"
  | "online"
  | "reconnecting"
  | "full"
  | "unavailable"
  | "superseded";
export class CoastRpcError extends Error {
  constructor(public readonly code: CoastErrorCode) {
    super(code);
  }
}
type Actions = {
  invite: (target: string) => Promise<void>;
  respond: (
    id: string,
    action: "accept" | "decline" | "cancel",
  ) => Promise<void>;
  receipt: (
    request: { place: HarborPlace } | { photoId: string },
  ) => Promise<string>;
};
const unavailable = async (): Promise<never> => {
  throw new CoastRpcError("NOT_JOINED");
};
const noActions: Actions = {
  invite: unavailable,
  respond: unavailable,
  receipt: unavailable,
};
export function useCoastConnection(options: {
  active: boolean;
  appearance: CoastAvatar;
  controls: RefObject<HarborControls | null>;
  onNight: (night: boolean) => void;
  onActionError: (code: "OUT_OF_REACH" | "SEAT_TAKEN") => void;
  getIdentityTicket: () => Promise<string | null>;
  onPhotoReady: (photo: CoastPhoto) => void;
  onPhotoEnded: (state: "declined" | "cancelled") => void;
}) {
  const configured = !!process.env.NEXT_PUBLIC_REALTIME_URL;
  const [enabled, setEnabled] = useState(true);
  const [attempt, setAttempt] = useState(0);
  const [phase, setPhase] = useState<Phase>(
    configured ? "connecting" : "alone",
  );
  const [count, setCount] = useState(0);
  const [selfId, setSelfId] = useState("");
  const [players, setPlayers] = useState<CoastSnapshot["players"]>([]);
  const [photo, setPhoto] = useState<CoastPhoto | null>(null);
  const snapshot = useRef<CoastSnapshot | null>(null);
  const clockOffset = useRef(0);
  const completed = useRef(new Set<string>());
  const actions = useRef<Actions>(noActions);
  const serverNow = useCallback(() => Date.now() + clockOffset.current, []);
  const latest = useRef(options);
  latest.current = options;

  useEffect(() => {
    if (!options.active || !enabled) {
      setPhase("alone");
      setCount(0);
      setPlayers([]);
      setPhoto(null);
      return;
    }
    const retained = retainRealtime();
    if (!retained) {
      setPhase(configured ? "unavailable" : "alone");
      return;
    }
    const { socket, release } = retained;
    let cancelled = false,
      joined = false,
      joining = false,
      terminal = false;
    let inputPending = false,
      appearancePending = false;
    let sequence = 0,
      revision = -1,
      snapshotAt = 0,
      sentAt = 0,
      retryAt = 0;
    let playerId = "",
      resumeToken: string | undefined;
    let lastIntent = "",
      sentAppearance = "",
      metadata = "",
      photoSignature = "";
    let movementVersion: 1 | 2 | 3 = 1;
    let identityAt = 0,
      identityPending = false;
    const identityTicket = () =>
      latest.current.getIdentityTicket().catch(() => null);
    const check = (result: CoastAck) => {
      if (!result?.ok) throw new CoastRpcError(result?.code ?? "UNAVAILABLE");
    };
    const ensureJoined = () => {
      if (!joined || !socket.connected || cancelled)
        throw new CoastRpcError("NOT_JOINED");
    };
    actions.current = {
      invite: async (target) => {
        ensureJoined();
        check(
          await socket.timeout(4000).emitWithAck("photo:invite", { target }),
        );
      },
      respond: async (id, action) => {
        ensureJoined();
        check(
          await socket
            .timeout(4000)
            .emitWithAck("photo:respond", { id, action }),
        );
      },
      receipt: async (request) => {
        ensureJoined();
        // Refresh the short-lived account proof before asking for a signed memory.
        check(
          await socket
            .timeout(4000)
            .emitWithAck("world:identity", await identityTicket()),
        );
        const result: CoastReceiptAck = await socket
          .timeout(4000)
          .emitWithAck("world:receipt", request);
        if (!result.ok) throw new CoastRpcError(result.code);
        return result.receipt;
      },
    };
    try {
      const value = sessionStorage.getItem("coast-guest-v1");
      if (value && /^[a-f0-9]{64}$/.test(value)) resumeToken = value;
    } catch {
      /* Reconnection within this mount still retains the in-memory token. */
    }
    const clearPeers = () => {
      latest.current.controls.current?.clearCompanions();
      setCount(0);
      setPlayers([]);
      setPhoto(null);
      snapshot.current = null;
      metadata = "";
      photoSignature = "";
    };
    const recover = () => {
      joined = false;
      revision = -1;
      retryAt = Date.now() + 1200;
      clearPeers();
      setPhase("reconnecting");
    };
    const error = (code: CoastErrorCode) => {
      if (cancelled) return;
      if (code === "SUPERSEDED") {
        joined = false;
        terminal = true;
        clearPeers();
        setPhase("superseded");
      } else if (code === "OUT_OF_REACH" || code === "SEAT_TAKEN") {
        latest.current.controls.current?.pose("idle");
        latest.current.onActionError(code);
      } else if (code === "UNAVAILABLE" || code === "NOT_JOINED") recover();
    };
    const receive = (raw: unknown) => {
      if (cancelled || !joined) return;
      const parsed = coastSnapshotSchema.safeParse(raw);
      if (!parsed.success || parsed.data.revision < revision) return;
      const value = parsed.data;
      if (!value.players.some((p) => p.id === playerId)) {
        recover();
        return;
      }
      snapshotAt = Date.now();
      revision = value.revision;
      const previousPhoto = snapshot.current?.photo;
      if (
        previousPhoto?.id === value.photo?.id &&
        (previousPhoto?.state === "pending" ||
          previousPhoto?.state === "scheduled") &&
        (value.photo?.state === "declined" ||
          value.photo?.state === "cancelled")
      )
        latest.current.onPhotoEnded(value.photo.state);
      snapshot.current = value;
      clockOffset.current = value.serverTime - Date.now();
      latest.current.controls.current?.synchronize(value, playerId);
      latest.current.onNight(value.night);
      setCount(value.players.length);
      const nextMetadata = JSON.stringify(
        value.players.map(({ id, name, host, avatarUrl }) => ({
          id,
          name,
          host,
          avatarUrl,
        })),
      );
      if (metadata !== nextMetadata) {
        metadata = nextMetadata;
        setPlayers(value.players);
      }
      const nextPhoto = JSON.stringify(value.photo);
      if (photoSignature !== nextPhoto) {
        photoSignature = nextPhoto;
        setPhoto(value.photo);
      }
      if (
        value.photo?.state === "complete" &&
        value.photo.composition &&
        !completed.current.has(value.photo.id)
      ) {
        completed.current.add(value.photo.id);
        if (completed.current.size > 64)
          completed.current.delete(completed.current.values().next().value!);
        latest.current.onPhotoReady(value.photo);
      }
      setPhase("online");
    };
    const join = async () => {
      if (
        cancelled ||
        terminal ||
        joining ||
        !socket.connected ||
        Date.now() < retryAt
      )
        return;
      joining = true;
      const appearance = latest.current.appearance;
      const ticket = await identityTicket();
      if (cancelled || !socket.connected) {
        joining = false;
        return;
      }
      identityAt = Date.now();
      socket.timeout(4000).emit(
        "world:join",
        {
          version: 1,
          appearance,
          ...(resumeToken ? { resumeToken } : {}),
          ...(ticket ? { identityTicket: ticket } : {}),
        },
        (err: Error | null, result: CoastJoinAck) => {
          joining = false;
          if (cancelled) return;
          if (err || !result) {
            retryAt = Date.now() + 2000;
            setPhase("reconnecting");
            return;
          }
          if (!result.ok) {
            retryAt = Date.now() + 4000;
            if (result.code === "ROOM_FULL") {
              terminal = true;
              setPhase("full");
            } else setPhase("unavailable");
            return;
          }
          joined = true;
          movementVersion = result.movementVersion ?? 1;
          revision = -1;
          playerId = result.playerId;
          setSelfId(playerId);
          resumeToken = result.resumeToken;
          sequence = 0;
          lastIntent = "";
          sentAppearance = JSON.stringify(appearance);
          try {
            sessionStorage.setItem("coast-guest-v1", resumeToken);
          } catch {
            /* Optional guest continuity. */
          }
          latest.current.controls.current?.clearCompanions();
          receive(result.snapshot);
        },
      );
    };
    const connected = () => {
      joining = false;
      joined = false;
      revision = -1;
      retryAt = 0;
      setPhase("connecting");
      join();
    };
    const disconnected = () => {
      if (cancelled || terminal) return;
      joining = false;
      recover();
    };
    socket.on("connect", connected);
    socket.on("disconnect", disconnected);
    socket.on("connect_error", disconnected);
    socket.on("world:snapshot", receive);
    setPhase("connecting");
    if (socket.connected) connected();
    else socket.connect();
    const timer = setInterval(() => {
      if (cancelled || terminal) return;
      if (!joined) {
        join();
        return;
      }
      if (!socket.connected) return;
      if (!identityPending && Date.now() - identityAt > 90_000) {
        identityPending = true;
        identityAt = Date.now();
        void identityTicket()
          .then((ticket) =>
            socket.timeout(4000).emitWithAck("world:identity", ticket),
          )
          .catch(() => {})
          .finally(() => {
            identityPending = false;
          });
      }
      if (Date.now() - snapshotAt > 5000) {
        recover();
        return;
      }
      const appearance = latest.current.appearance,
        signature = JSON.stringify(appearance);
      if (!appearancePending && signature !== sentAppearance) {
        appearancePending = true;
        socket
          .timeout(2500)
          .emit(
            "world:appearance",
            appearance,
            (err: Error | null, result: CoastAck) => {
              appearancePending = false;
              if (cancelled || err) return;
              if (result?.ok) sentAppearance = signature;
              else if (result) error(result.code);
            },
          );
      }
      const intent = latest.current.controls.current?.networkIntent();
      if (!intent || inputPending) return;
      const serialized = JSON.stringify(intent),
        moving = Math.hypot(intent.direction.x, intent.direction.z) > 0.001;
      if (!moving && serialized === lastIntent && Date.now() - sentAt < 1000)
        return;
      inputPending = true;
      sentAt = Date.now();
      lastIntent = serialized;
      socket
        .timeout(2500)
        .volatile.emit(
          "world:input",
          coastMovementInput(intent, ++sequence, movementVersion),
          (err: Error | null, result: CoastAck) => {
            inputPending = false;
            if (!cancelled && !err && result && !result.ok) {
              if (result.code === "INVALID_PAYLOAD" && movementVersion > 1) {
                movementVersion = movementVersion === 3 ? 2 : 1;
                lastIntent = "";
              } else error(result.code);
            }
          },
        );
    }, 100);
    return () => {
      cancelled = true;
      actions.current = noActions;
      clearInterval(timer);
      socket.off("connect", connected);
      socket.off("disconnect", disconnected);
      socket.off("connect_error", disconnected);
      socket.off("world:snapshot", receive);
      if (socket.connected) socket.timeout(2000).emit("world:leave", () => {});
      latest.current.controls.current?.clearCompanions();
      release();
    };
  }, [options.active, enabled, configured, attempt]);
  return {
    phase,
    count,
    selfId,
    players,
    photo,
    serverNow,
    invite: (target: string) => actions.current.invite(target),
    respond: (id: string, action: "accept" | "decline" | "cancel") =>
      actions.current.respond(id, action),
    receipt: (request: { place: HarborPlace } | { photoId: string }) =>
      actions.current.receipt(request),
    approach: (id: string) => {
      const player = snapshot.current?.players.find((p) => p.id === id);
      if (player)
        latest.current.controls.current?.walkTo({
          x: player.x,
          z: player.pose === "sit" ? -1.2 : player.z + 0.9,
        });
    },
    configured,
    enabled,
    setEnabled,
    retry: () => {
      setEnabled(true);
      setAttempt((n) => n + 1);
    },
  };
}
