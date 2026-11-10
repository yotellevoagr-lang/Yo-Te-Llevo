
"use client"
import { useEffect } from "react";
import { onMessage } from "firebase/messaging";
import { useToast } from "@/hooks/use-toast";
import { messaging } from "@/lib/firebase";

export function FirebaseMessaging() {
  const { toast } = useToast();

  useEffect(() => {
    if (!messaging) return;
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      try {
        const unsubscribe = onMessage(messaging, (payload) => {
          toast({
            title: payload.notification?.title,
            description: payload.notification?.body,
          });
        });
        return () => {
          unsubscribe(); 
        };
      } catch (err) {
        console.warn("[FirebaseMessaging] onMessage error:", err);
      }
    }
  }, [toast]);

  return null;
}
