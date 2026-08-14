"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePwaUpdate } from "@/components/pwa/pwa-provider";
import { usePolar } from "@/components/app/app-context";
import { disablePush, enablePush, readPushCapability, type PushCapability } from "@/lib/client/push";
import { flushQueuedRecords, initializeOfflineRecords } from "@/lib/client/offline-records";
import type { NotificationSnapshot } from "@/lib/db/notifications";

type NotificationCenterValue = {
  snapshot: NotificationSnapshot;
  now: number;
  unreadCount: number;
  online: boolean;
  pendingSync: number;
  pushCapability: PushCapability;
  pushFeedback: string;
  updateReady: boolean;
  refresh: () => Promise<void>;
  markRead: (ids?: string[]) => Promise<void>;
  savePreferences: (preferences: NotificationSnapshot["preferences"]) => Promise<void>;
  activatePush: () => Promise<void>;
  deactivatePush: () => Promise<void>;
  testPush: () => Promise<void>;
  applyUpdate: () => void;
  dismissUpdate: () => void;
};

const NotificationCenterContext = createContext<NotificationCenterValue | null>(null);

export function NotificationCenterProvider({
  initialSnapshot,
  children,
}: {
  initialSnapshot: NotificationSnapshot;
  children: ReactNode;
}) {
  const { patient } = usePolar();
  const { updateReady, applyUpdate, dismissUpdate } = usePwaUpdate();
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [now, setNow] = useState(initialSnapshot.serverNow);
  const [online, setOnline] = useState(true);
  const [pendingSync, setPendingSync] = useState(0);
  const [pushCapability, setPushCapability] = useState<PushCapability>("unsupported");
  const [pushFeedback, setPushFeedback] = useState("");
  const refreshingRef = useRef(false);

  const refresh = useCallback(async () => {
    if (refreshingRef.current || !navigator.onLine) return;
    refreshingRef.current = true;
    try {
      const response = await fetch(`/api/notifications?patientId=${encodeURIComponent(patient.id)}`, { cache: "no-store" });
      if (!response.ok) return;
      const next = await response.json() as NotificationSnapshot;
      setSnapshot(next);
      setNow(next.serverNow);
    } catch {
      return;
    } finally {
      refreshingRef.current = false;
    }
  }, [patient.id]);

  useEffect(() => {
    const updateConnection = () => {
      setOnline(navigator.onLine);
      if (navigator.onLine) {
        void flushQueuedRecords().then(() => refresh());
      }
    };
    const updateSync = (event: Event) => {
      const detail = (event as CustomEvent<{ pending: number }>).detail;
      setPendingSync(Math.max(0, detail?.pending || 0));
    };
    const updateCenter = () => void refresh();
    const initial = window.setTimeout(() => {
      setOnline(navigator.onLine);
      void initializeOfflineRecords().then(() => refresh());
    }, 0);
    window.addEventListener("online", updateConnection);
    window.addEventListener("offline", updateConnection);
    window.addEventListener("polar:sync-status", updateSync);
    window.addEventListener("polar:center-refresh", updateCenter);
    return () => {
      window.removeEventListener("online", updateConnection);
      window.removeEventListener("offline", updateConnection);
      window.removeEventListener("polar:sync-status", updateSync);
      window.removeEventListener("polar:center-refresh", updateCenter);
      window.clearTimeout(initial);
    };
  }, [refresh]);

  useEffect(() => {
    const interval = window.setInterval(() => setNow((value) => value + 1000), 1000);
    const poll = window.setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, 30_000);
    const visible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", visible);
    return () => {
      window.clearInterval(interval);
      window.clearInterval(poll);
      document.removeEventListener("visibilitychange", visible);
    };
  }, [refresh]);

  useEffect(() => {
    void readPushCapability().then(setPushCapability).catch(() => setPushCapability("unsupported"));
  }, []);

  const unreadCount = useMemo(() => {
    const unreadSources = new Set(
      snapshot.notifications
        .filter((item) => !item.readAt)
        .map((item) => `${item.sourceType}:${item.sourceId}`),
    );
    const dueWithoutNotification = snapshot.timers.filter(
      (timer) => (timer.status === "due" || (timer.status === "active" && new Date(timer.dueAt).getTime() <= now))
        && !unreadSources.has(`timer:${timer.id}`),
    ).length;
    return snapshot.notifications.filter((item) => !item.readAt).length
      + dueWithoutNotification
      + (updateReady && snapshot.preferences.updatesEnabled ? 1 : 0);
  }, [now, snapshot, updateReady]);

  const markRead = useCallback(async (ids?: string[]) => {
    const selected = ids ? new Set(ids) : null;
    setSnapshot((current) => ({
      ...current,
      notifications: current.notifications.map((item) => (
        !selected || selected.has(item.id) ? { ...item, readAt: item.readAt || new Date().toISOString() } : item
      )),
    }));
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "read", patientId: patient.id, ids }),
    });
  }, [patient.id]);

  const savePreferences = useCallback(async (preferences: NotificationSnapshot["preferences"]) => {
    const previous = snapshot.preferences;
    setSnapshot((current) => ({ ...current, preferences }));
    const response = await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "preferences", patientId: patient.id, preferences }),
    });
    if (!response.ok) {
      setSnapshot((current) => ({ ...current, preferences: previous }));
      setPushFeedback("No se pudieron guardar las preferencias.");
    }
  }, [patient.id, snapshot.preferences]);

  const activatePush = useCallback(async () => {
    setPushFeedback("");
    try {
      await enablePush();
      setPushCapability("active");
      setPushFeedback("Este dispositivo recibirá avisos de Polar.");
    } catch (error) {
      setPushCapability(await readPushCapability().catch((): PushCapability => "unsupported"));
      setPushFeedback(error instanceof Error ? error.message : "No se pudieron activar las notificaciones.");
    }
  }, []);

  const deactivatePush = useCallback(async () => {
    setPushFeedback("");
    try {
      await disablePush();
      setPushCapability(await readPushCapability());
      setPushFeedback("Las notificaciones se desactivaron en este dispositivo.");
    } catch {
      setPushFeedback("No se pudieron desactivar las notificaciones.");
    }
  }, []);

  const testPush = useCallback(async () => {
    setPushFeedback("");
    const response = await fetch("/api/push/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ patientId: patient.id }),
    });
    const body = await response.json().catch(() => ({})) as { error?: string };
    setPushFeedback(response.ok ? "Notificación de prueba enviada." : body.error || "No se pudo enviar la prueba.");
    if (response.ok) void refresh();
  }, [patient.id, refresh]);

  const value = useMemo<NotificationCenterValue>(() => ({
    snapshot,
    now,
    unreadCount,
    online,
    pendingSync,
    pushCapability,
    pushFeedback,
    updateReady,
    refresh,
    markRead,
    savePreferences,
    activatePush,
    deactivatePush,
    testPush,
    applyUpdate,
    dismissUpdate,
  }), [
    snapshot,
    now,
    unreadCount,
    online,
    pendingSync,
    pushCapability,
    pushFeedback,
    updateReady,
    refresh,
    markRead,
    savePreferences,
    activatePush,
    deactivatePush,
    testPush,
    applyUpdate,
    dismissUpdate,
  ]);

  return <NotificationCenterContext.Provider value={value}>{children}</NotificationCenterContext.Provider>;
}

export function useNotificationCenter() {
  const context = useContext(NotificationCenterContext);
  if (!context) throw new Error("NotificationCenterProvider is missing");
  return context;
}
