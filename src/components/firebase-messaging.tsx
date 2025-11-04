
"use client"
import { useEffect } from "react";
import { getMessaging, onMessage } from "firebase/messaging";
import { useToast } from "@/hooks/use-toast";
import { app } from "@/lib/firebase";

export function FirebaseMessaging() {
  const { toast } = useToast();

  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      const messaging = getMessaging(app);
      const unsubscribe = onMessage(messaging, (payload) => {
        console.log("Foreground message received.", payload);
        toast({
          title: payload.notification?.title,
          description: payload.notification?.body,
        });
      });
      return () => {
        unsubscribe(); 
      };
    }
  }, [toast]);

  return null;
}
