
"use client"

import { useState, useEffect, useCallback } from "react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Bell, Palette, Languages, Loader2 } from "lucide-react";
import { ThemeToggle } from "@/app/theme-toggle";
import { LanguageToggle } from "@/app/language-toggle";
import { useAuth } from "@/components/auth/auth-provider";
import { getToken } from "firebase/messaging";
import { messaging } from "@/lib/firebase";
import { saveDocument } from "@/lib/firestore-services";

export default function SettingsPage() {
    const { user } = useAuth();
    const [notificationStatus, setNotificationStatus] = useState<"default" | "granted" | "denied">("default");
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
        if ("Notification" in window) {
            setNotificationStatus(Notification.permission);
        }
    }, []);

    const handleNotificationToggle = async (checked: boolean) => {
        if (!messaging) return;
        if (checked) {
            try {
                const permission = await Notification.requestPermission();
                setNotificationStatus(permission);
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
        } else {
            // Cannot programmatically un-grant permission.
            // This switch will just reflect the state. If they want to disable,
            // they must do so in browser settings.
        }
    }
    
    if (!isClient) {
        return <div className="flex items-center justify-center min-h-screen"><Loader2 className="w-8 h-8 animate-spin"/></div>
    }

    return (
        <div className="flex flex-col min-h-screen bg-muted/20">
            <SiteHeader />
            <main className="flex-1 py-12 md:py-16">
                <div className="container max-w-2xl">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-3xl font-headline">Ajustes</CardTitle>
                            <CardDescription>
                                Gestiona las notificaciones y las preferencias de la aplicación.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-8">
                            <div className="space-y-4 p-4 border rounded-lg">
                                <h3 className="font-semibold text-lg flex items-center gap-2"><Bell className="w-5 h-5 text-primary"/> Notificaciones</h3>
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="notifications-switch" className="flex-1">
                                        Recibir notificaciones sobre nuevos viajes y ofertas
                                    </Label>
                                    <Switch
                                        id="notifications-switch"
                                        checked={notificationStatus === 'granted'}
                                        onCheckedChange={handleNotificationToggle}
                                        disabled={notificationStatus === 'denied'}
                                    />
                                </div>
                                {notificationStatus === 'denied' && (
                                    <p className="text-xs text-destructive">
                                        Has bloqueado las notificaciones. Para activarlas, debes cambiar los permisos en la configuración de tu navegador.
                                    </p>
                                )}
                            </div>

                             <div className="space-y-4 p-4 border rounded-lg">
                                <h3 className="font-semibold text-lg flex items-center gap-2"><Palette className="w-5 h-5 text-primary"/> Apariencia</h3>
                                <div className="flex items-center justify-between">
                                    <Label>
                                        Tema de la aplicación (Claro/Oscuro)
                                    </Label>
                                    <ThemeToggle />
                                </div>
                                 <div className="flex items-center justify-between">
                                    <Label>
                                        Idioma
                                    </Label>
                                    <LanguageToggle />
                                </div>
                            </div>

                        </CardContent>
                    </Card>
                </div>
            </main>
            <SiteFooter />
        </div>
    );
}
