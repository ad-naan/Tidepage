"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useLocale, useTranslations } from "next-intl";
import { useIdentity } from "@/modules/identity/ui/IdentityProvider";
import {
  targetKey,
  type EngagementTarget,
} from "@/modules/engagement/domain/target";
import type {
  InteractionKind,
  InteractionState,
} from "@/modules/engagement/domain/interactions";
import { apiGet, apiSend, ApiClientError } from "@/shared/http/client";
import { useNotice } from "@/shared/ui/feedback/NoticeProvider";

const EngagementContext = createContext<{
  states: Record<string, InteractionState>;
  pending: string[];
  loading: boolean;
  error: boolean;
  reload: () => void;
  change: (target: EngagementTarget, kind: InteractionKind) => Promise<void>;
} | null>(null);

export function EngagementProvider({
  targets,
  children,
}: {
  targets: EngagementTarget[];
  children: ReactNode;
}) {
  const locale = useLocale();
  const t = useTranslations("engagement");
  const { principal, openLogin } = useIdentity();
  const { notify } = useNotice();
  const signature = JSON.stringify([
    ...new Map(targets.map((target) => [targetKey(target), target])).values(),
  ]);
  const [states, setStates] = useState<Record<string, InteractionState>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [pending, setPending] = useState<string[]>([]);
  const locks = useRef(new Set<string>());
  const version = useRef(0);
  const controller = useRef<AbortController | null>(null);
  const load = useCallback(async () => {
    controller.current?.abort();
    const abort = new AbortController();
    controller.current = abort;
    const current = ++version.current;
    locks.current.clear();
    setPending([]);
    setStates({});
    setLoading(true);
    setError(false);
    try {
      const grouped = new Map<string, string[]>();
      for (const target of JSON.parse(signature) as EngagementTarget[]) {
        grouped.set(target.type, [
          ...(grouped.get(target.type) ?? []),
          target.id,
        ]);
      }
      const requests: Promise<InteractionState[]>[] = [];
      for (const [type, ids] of grouped)
        for (let start = 0; start < ids.length; start += 100) {
          const query = new URLSearchParams({ type, locale });
          ids.slice(start, start + 100).forEach((id) => query.append("id", id));
          requests.push(
            apiGet<InteractionState[]>(`/api/v1/interactions?${query}`, {
              signal: abort.signal,
            }),
          );
        }
      const results = (await Promise.all(requests)).flat();
      if (version.current === current && !abort.signal.aborted)
        setStates(
          Object.fromEntries(
            results.map((state) => [targetKey(state.target), state]),
          ),
        );
    } catch {
      if (version.current === current && !abort.signal.aborted) setError(true);
    } finally {
      if (version.current === current && !abort.signal.aborted)
        setLoading(false);
    }
  }, [signature, locale, principal?.id]);
  useEffect(() => {
    void load();
    return () => {
      ++version.current;
      controller.current?.abort();
    };
  }, [load]);
  async function change(target: EngagementTarget, kind: InteractionKind) {
    if (!principal) {
      openLogin();
      return;
    }
    const key = targetKey(target);
    const state = states[key];
    if (!state || loading || locks.current.has(key)) return;
    const current = version.current;
    const active = !(kind === "like" ? state.liked : state.saved);
    locks.current.add(key);
    setPending((previous) => [...previous, key]);
    try {
      const result = await apiSend<InteractionState>(
        "/api/v1/interactions",
        "PUT",
        { target, locale, kind, active },
      );
      if (current !== version.current) return;
      setStates((previous) => ({ ...previous, [key]: result }));
      notify({
        title: t(
          kind === "like"
            ? active
              ? "liked"
              : "unliked"
            : active
              ? "saved"
              : "unsaved",
        ),
        tone: "success",
      });
    } catch (failure) {
      if (current !== version.current) return;
      notify({
        title: t(
          failure instanceof ApiClientError && failure.status === 401
            ? "sessionExpired"
            : "changeFailed",
        ),
        tone: "error",
      });
    } finally {
      if (current === version.current) {
        locks.current.delete(key);
        setPending((previous) => previous.filter((value) => value !== key));
      }
    }
  }
  return (
    <EngagementContext.Provider
      value={{
        states,
        pending,
        loading,
        error,
        reload: () => void load(),
        change,
      }}
    >
      {children}
    </EngagementContext.Provider>
  );
}
export function useEngagement() {
  const context = useContext(EngagementContext);
  if (!context) throw new Error("EngagementProvider is required");
  return context;
}
