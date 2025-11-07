
"use client"

import { useState, useEffect } from "react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Bell, Palette, Languages, Loader2, MapPin } from "lucide-react";
import { ThemeToggle } from "@/app/theme-toggle";
import { LanguageToggle } from "@/app/language-toggle";
import { useAuth } from "@/components/auth/auth-provider";
import { getToken } from "firebase/messaging";
import { messaging } from "@/lib/firebase";
import { saveDocument } from "@/lib/firestore-services";

export default function SettingsPage() {
    const { user } = useAuth();
    const [notificationStatus, setNotificationStatus] = useState<NotificationPermission>("default");
    const [locationStatus, setLocationStatus] = useState<PermissionState>("prompt");
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
        if ("Notification" in window) {
            setNotificationStatus(Notification.permission);
        }
        if ("permissions" in navigator) {
            navigator.permissions.query({ name: 'geolocation' }).then(permissionStatus => {
                setLocationStatus(permissionStatus.state);
                permissionStatus.onchange = () => {
                    setLocationStatus(permissionStatus.state);
                };
            });
        }
    }, []);

    const handleNotificationToggle = async (checked: boolean) => {
        if (checked) {
            if (!messaging) return;
            try {
                const permission = await Notification.requestPermission();
                setNotificationStatus(permission);
                if (permission === 'granted') {
                    const currentToken = await getToken(messaging, { vapidKey: 'BMD30s-1GFp0f1nCqcFg4J9b139Nff2XgnJj34Sg0gEwIza_I9lQ4lMhA13h1UirYyagESpI52xH1WzmsC5Tey0' });
                    if (currentToken && user) {
                         await saveDocument('fcmTokens', { 
                            token: currentToken, 
                            createdAt: new Date(),
                            userId: user.id
                        }, currentToken);
                    }
                }
            } catch (error) {
                console.error('Error requesting notification permission:', error);
            }
        }
    };
    
    const handleLocationToggle = (checked: boolean) => {
        if (checked) {
            if ("geolocation" in navigator) {
                navigator.geolocation.getCurrentPosition(
                    () => { /* Success, state will update via onchange */ },
                    () => { /* Error, state will update via onchange */ }
                );
            }
        }
    };
    
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
                                <h3 className="font-semibold text-lg flex items-center gap-2"><MapPin className="w-5 h-5 text-primary"/> Ubicación</h3>
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="location-switch" className="flex-1">
                                        Permitir acceso a la ubicación para una mejor experiencia
                                    </Label>
                                    <Switch
                                        id="location-switch"
                                        checked={locationStatus === 'granted'}
                                        onCheckedChange={handleLocationToggle}
                                        disabled={locationStatus === 'denied'}
                                    />
                                </div>
                                {locationStatus === 'denied' && (
                                    <p className="text-xs text-destructive">
                                        Has bloqueado el acceso a la ubicación. Para activarlo, debes cambiar los permisos en la configuración de tu navegador.
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
