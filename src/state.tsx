import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { api, ApiError } from "./api.ts";
import type { HouseholdData, Me } from "../shared/types.ts";

const EMPTY: HouseholdData = { pets: [], tasks: [], notes: [], bookings: [], professionals: [], activities: [] };
const POLL_MS = 20_000;

export type ResourceKey = keyof HouseholdData;

interface AppState {
  me: Me | null;
  data: HouseholdData;
  loading: boolean;
  setMe: (me: Me | null) => void;
  refresh: () => Promise<void>;
  reloadMe: () => Promise<void>;
  create: <T>(key: ResourceKey, body: Record<string, unknown>) => Promise<T>;
  update: <T>(key: ResourceKey, id: number, body: Record<string, unknown>) => Promise<T>;
  remove: (key: ResourceKey, id: number) => Promise<void>;
  toggleTask: (id: number) => Promise<void>;
  toast: (msg: string) => void;
  toastMsg: string | null;
}

const Ctx = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<Me | null>(null);
  const [data, setData] = useState<HouseholdData>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const toastTimer = useRef<number>(undefined);

  const toast = useCallback((msg: string) => {
    setToastMsg(msg);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToastMsg(null), 2600);
  }, []);

  const refresh = useCallback(async () => {
    try {
      setData(await api<HouseholdData>("GET", "/data"));
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) setMe(null);
    }
  }, []);

  const reloadMe = useCallback(async () => {
    try {
      setMe(await api<Me>("GET", "/me"));
    } catch {
      setMe(null);
    }
  }, []);

  useEffect(() => {
    reloadMe().finally(() => setLoading(false));
  }, [reloadMe]);

  // Load data whenever the active household changes; keep family edits in
  // sync by polling while visible and refreshing when the tab regains focus.
  const householdId = me?.household.id;
  useEffect(() => {
    if (!householdId) {
      setData(EMPTY);
      return;
    }
    refresh();
    const tick = () => document.visibilityState === "visible" && refresh();
    const id = window.setInterval(tick, POLL_MS);
    document.addEventListener("visibilitychange", tick);
    window.addEventListener("focus", tick);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
      window.removeEventListener("focus", tick);
    };
  }, [householdId, refresh]);

  const create = useCallback(
    async <T,>(key: ResourceKey, body: Record<string, unknown>) => {
      const row = await api<T>("POST", `/${key}`, body);
      await refresh();
      return row;
    },
    [refresh],
  );

  const update = useCallback(
    async <T,>(key: ResourceKey, id: number, body: Record<string, unknown>) => {
      const row = await api<T>("PATCH", `/${key}/${id}`, body);
      await refresh();
      return row;
    },
    [refresh],
  );

  const remove = useCallback(
    async (key: ResourceKey, id: number) => {
      await api("DELETE", `/${key}/${id}`);
      await refresh();
    },
    [refresh],
  );

  const toggleTask = useCallback(
    async (id: number) => {
      // Optimistic flip so the checkbox feels instant.
      setData((d) => ({
        ...d,
        tasks: d.tasks.map((t) => (t.id === id ? { ...t, done_at: t.done_at ? null : new Date().toISOString() } : t)),
      }));
      try {
        await api("POST", `/tasks/${id}/toggle`);
      } finally {
        await refresh();
      }
    },
    [refresh],
  );

  const value = useMemo<AppState>(
    () => ({ me, data, loading, setMe, refresh, reloadMe, create, update, remove, toggleTask, toast, toastMsg }),
    [me, data, loading, refresh, reloadMe, create, update, remove, toggleTask, toast, toastMsg],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): AppState {
  const v = useContext(Ctx);
  if (!v) throw new Error("useApp outside AppProvider");
  return v;
}

/** Signed-in variant: components under the authenticated shell can rely on `me`. */
export function useSession() {
  const app = useApp();
  if (!app.me) throw new Error("useSession requires a signed-in user");
  return { ...app, me: app.me };
}
