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
    const userId = user?.id;
    const role = userRole || undefined;

    // Track page view on route change
    if (pathname !== lastPath.current) {
      lastPath.current = pathname;
      trackPageView(pathname, userId, role);
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
  }, [pathname, user?.id, userRole]);

  return null;
}
