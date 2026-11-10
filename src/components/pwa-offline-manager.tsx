"use client";

import { useEffect, useState, useCallback } from "react";
import { usePathname } from "next/navigation";
import { WifiOff, RefreshCw, CheckCircle2, CloudUpload } from "lucide-react";
import {
  syncOfflineQueue,
  getPendingSyncCount,
  prefetchCoreDataForOffline,
} from "@/lib/firestore-services";
import { useToast } from "@/hooks/use-toast";

export function PwaOfflineManager() {
  const [isOffline, setIsOffline] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [justSyncedCount, setJustSyncedCount] = useState<number | null>(null);
  const pathname = usePathname();
  const { toast } = useToast();

  const triggerSync = useCallback(async () => {
    if (typeof navigator !== "undefined" && !navigator.onLine) return;
    const countBefore = getPendingSyncCount();
    if (countBefore === 0) return;

    setIsSyncing(true);
    try {
      const { synced, remaining } = await syncOfflineQueue();
      setPendingCount(remaining);
      if (synced > 0) {
        setJustSyncedCount(synced);
        toast({
          title: "Sincronización completada",
          description: `Se sincronizaron ${synced} cambio(s) realizados sin conexión.`,
        });
        setTimeout(() => setJustSyncedCount(null), 4500);
      }
    } finally {
      setIsSyncing(false);
    }
  }, [toast]);

  // Register Service Worker and initial data warm-up
  useEffect(() => {
    if (typeof window === "undefined") return;

    setIsOffline(!window.navigator.onLine);
    setPendingCount(getPendingSyncCount());

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .catch((err) => {
          console.warn("[PWA] Service Worker registration warning:", err);
        });
    }

    if (window.navigator.onLine) {
      prefetchCoreDataForOffline();
      triggerSync();
    }

    const handleOnline = () => {
      setIsOffline(false);
      triggerSync();
      prefetchCoreDataForOffline();
    };

    const handleOffline = () => {
      setIsOffline(true);
      setPendingCount(getPendingSyncCount());
    };

    const handleSyncStatus = (event: Event) => {
      const customEvent = event as CustomEvent<{
        syncing?: boolean;
        pendingCount?: number;
        syncedCount?: number;
      }>;
      if (typeof customEvent.detail?.pendingCount === "number") {
        setPendingCount(customEvent.detail.pendingCount);
      } else {
        setPendingCount(getPendingSyncCount());
      }
      if (typeof customEvent.detail?.syncing === "boolean") {
        setIsSyncing(customEvent.detail.syncing);
      }
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("ytl-sync-status", handleSyncStatus);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("ytl-sync-status", handleSyncStatus);
    };
  }, [triggerSync]);

  // Warm the Service Worker page cache whenever the user visits a route via client-side navigation
  useEffect(() => {
    if (typeof window === "undefined" || !window.navigator.onLine || !pathname) return;
    // Fetch the current route HTML in the background so the Service Worker caches this visited route for offline reload
    fetch(pathname, {
      headers: { Accept: "text/html" },
       credentials: "same-origin",
    }).catch(() => {});
  }, [pathname]);

  if (!isOffline && pendingCount === 0 && !isSyncing && justSyncedCount === null) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 z-50 max-w-sm pointer-events-auto">
      {isOffline ? (
        <div className="flex items-center gap-3 rounded-xl border border-amber-500/40 bg-background/95 backdrop-blur-md px-4 py-2.5 shadow-lg text-xs">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400">
            <WifiOff className="h-4 w-4" />
          </div>
          <div className="space-y-0.5">
            <p className="font-semibold text-foreground flex items-center gap-1.5">
              Modo sin conexión activo
              {pendingCount > 0 && (
                <span className="inline-flex items-center rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-300">
                  {pendingCount} pendiente{pendingCount > 1 ? "s" : ""}
                </span>
              )}
            </p>
            <p className="text-[11px] text-muted-foreground leading-snug">
              Viajes cargados, reservas y paneles disponibles. Los cambios se sincronizarán al volver internet.
            </p>
          </div>
        </div>
      ) : isSyncing || pendingCount > 0 ? (
        <div className="flex items-center gap-3 rounded-xl border border-primary/30 bg-background/95 backdrop-blur-md px-4 py-2.5 shadow-lg text-xs">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
            {isSyncing ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <CloudUpload className="h-4 w-4" />
            )}
          </div>
          <div className="flex-1 space-y-0.5">
            <p className="font-semibold text-foreground">
              {isSyncing
                ? "Sincronizando cambios..."
                : `${pendingCount} cambio(s) listos para sincronizar`}
            </p>
            <p className="text-[11px] text-muted-foreground">
              Actualizando reservas y datos con el servidor
            </p>
          </div>
          {!isSyncing && (
            <button
              type="button"
              onClick={triggerSync}
              className="rounded-lg bg-primary px-2.5 py-1 text-[11px] font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Sincronizar
            </button>
          )}
        </div>
      ) : justSyncedCount !== null ? (
        <div className="flex items-center gap-2.5 rounded-xl border border-emerald-500/40 bg-background/95 backdrop-blur-md px-4 py-2.5 shadow-lg text-xs">
          <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
          <span className="font-medium text-foreground">
            ¡Conexión restablecida! {justSyncedCount} cambio(s) sincronizado(s).
          </span>
        </div>
      ) : null}
    </div>
  );
}
