
"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { Loader2, MapPin } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import type { GeoSettings } from "@/lib/types";
import { getDocumentById, saveDocument } from "@/lib/firestore-services";

const MapSelector = dynamic(
  () => import('@/components/admin/map-selector').then((mod) => mod.MapSelector),
  { 
    ssr: false,
    loading: () => <div className="h-96 flex items-center justify-center bg-muted rounded-lg"><Loader2 className="w-8 h-8 animate-spin"/></div>
  }
);

export function GeoSettingsCard() {
    const [geoSettings, setGeoSettings] = useState<GeoSettings>({ latitude: -34.6037, longitude: -58.3816, radiusKm: 100 });
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isClient, setIsClient] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        // This ensures the component only renders its content on the client side
        setIsClient(true);

        const fetchGeoData = async () => {
            setIsLoading(true);
            const data = await getDocumentById<GeoSettings>('settings', 'geo');
            if (data) {
                setGeoSettings(data);
            }
            setIsLoading(false);
        }
        fetchGeoData();
    }, []);

    const handleSaveGeo = async () => {
        setIsSaving(true);
        try {
            await saveDocument('settings', geoSettings, 'geo');
            window.dispatchEvent(new Event('storage'));
            toast({ title: "Zona guardada", description: "La zona de servicio ha sido actualizada." });
        } catch (error) {
            toast({ title: "Error", description: "No se pudo guardar la zona geográfica.", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><MapPin className="w-6 h-6"/> Zona Geográfica</CardTitle>
                <CardDescription>Define el centro y el radio de tu zona de servicio.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {isClient ? (
                    isLoading ? (
                        <div className="flex justify-center items-center h-96"><Loader2 className="w-8 h-8 animate-spin" /></div>
                    ) : (
                        <>
                            <MapSelector settings={geoSettings} onSettingsChange={setGeoSettings} />
                            <Button onClick={handleSaveGeo} disabled={isSaving}>
                                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                                Guardar Zona
                            </Button>
                        </>
                    )
                ) : (
                     <div className="h-96 flex items-center justify-center bg-muted rounded-lg"><Loader2 className="w-8 h-8 animate-spin"/></div>
                )}
            </CardContent>
        </Card>
    );
}
