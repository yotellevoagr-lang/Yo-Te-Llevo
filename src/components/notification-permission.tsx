
"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, X } from "lucide-react";
import { getToken } from "firebase/messaging";
import { messaging } from "@/lib/firebase";
import { saveDocument } from "@/lib/firestore-services";
import { useAuth } from "./auth/auth-provider";

export function NotificationPermission() {
  const [showPrompt, setShowPrompt] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    // We need a slight delay to ensure Notification.permission is available and not 'default' from a previous interaction in the same session
    const timer = setTimeout(() => {
        if (typeof window !== 'undefined' && 'Notification' in window) {
            const permissionStatus = Notification.permission;
            const dismissed = sessionStorage.getItem('notification_prompt_dismissed');
            if (permissionStatus === 'default' && !dismissed) {
                setShowPrompt(true);
            }
        }
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  const handleRequestPermission = async () => {
    setShowPrompt(false); // Ocultar inmediatamente
    sessionStorage.setItem('notification_prompt_dismissed', 'true'); // Marcar como interactuado

    if (!messaging) return;
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        const currentToken = await getToken(messaging, { vapidKey: 'BMD30s-1GFp0f1nCqcFg4J9b139Nff2XgnJj34Sg0gEwIza_I9lQ4lMhA13h1UirYyagESpI52xH1WzmsC5Tey0' });
        if (currentToken) {
          await saveDocument('fcmTokens', { 
            token: currentToken, 
            createdAt: new Date(),
            userId: user?.id || null 
          }, currentToken);
        }
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    sessionStorage.setItem('notification_prompt_dismissed', 'true');
  };

  if (!showPrompt) {
    return null;
  }

  return (
    <div className="fixed bottom-6 left-6 z-50 animate-fade-in-up">
      <Card className="max-w-sm shadow-lg">
        <CardHeader>
          <div className="flex items-start justify-between">
             <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-full">
                    <Bell className="w-6 h-6 text-primary" />
                </div>
                <div>
                    <CardTitle className="text-base">Recibir Notificaciones</CardTitle>
                    <CardDescription className="text-xs">
                        Actívalas para no perderte nuevas ofertas y viajes.
                    </CardDescription>
                </div>
             </div>
             <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleDismiss}>
                <X className="w-4 h-4"/>
             </Button>
          </div>
        </CardHeader>
        <CardFooter className="flex gap-2 p-3 pt-0">
          <Button variant="outline" size="sm" onClick={handleDismiss} className="flex-1">Ahora No</Button>
          <Button size="sm" onClick={handleRequestPermission} className="flex-1">Activar</Button>
        </CardFooter>
      </Card>
    </div>
  );
}
