"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { updatePresence, trackPageView } from "@/lib/analytics-service";
import { useAuth } from "@/components/auth/auth-provider";

export function PageTracker() {
  const pathname = usePathname();
  const { user, userRole } = useAuth();
  const lastPath = useRef<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const userId = (user as any)?.id;
    const role = userRole || undefined;

    // Track page view on route change (Firestore + Firebase Analytics)
    if (pathname !== lastPath.current) {
      lastPath.current = pathname;
      // Firestore-based tracking (admin panel)
      trackPageView(pathname, userId, role);
      // Firebase Analytics logEvent (appears in Firebase console dashboard)
      if (typeof window !== 'undefined') {
        import('firebase/analytics').then(({ logEvent, getAnalytics }) => {
          import('@/lib/firebase').then(({ app }) => {
            import('firebase/analytics').then(({ isSupported }) => {
              isSupported().then(supported => {
                if (supported && process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID) {
                  try {
                    const analyticsInstance = getAnalytics(app);
                    logEvent(analyticsInstance, 'page_view', {
                      page_path: pathname,
                      page_title: document.title,
                    });
                  } catch {}
                }
              }).catch(() => {});
            });
          });
        }).catch(() => {});
      }
    }

    // Update presence immediately
    updatePresence(pathname, userId, role);

    // Keep presence alive every 90 seconds
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      updatePresence(pathname, userId, role);
    }, 90_000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [pathname, (user as any)?.id, userRole]);

  return null;
}
