
"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { Loader2, MapPin } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import type { GeoSettings } from "@/lib/types";

const MapSelector = dynamic(
  () => import('@/components/admin/map-selector').then((mod) => mod.MapSelector),
  { 
    ssr: false,
    loading: () => <div className="h-96 flex items-center justify-center bg-muted rounded-lg"><Loader2 className="w-8 h-8 animate-spin"/></div>
  }
);

interface GeoSettingsCardProps {
    settings: GeoSettings;
    onSettingsChange: (settings: GeoSettings) => void;
}

export function GeoSettingsCard({ settings, onSettingsChange }: GeoSettingsCardProps) {
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    return (
        <>
            {isClient ? (
                <MapSelector settings={settings} onSettingsChange={onSettingsChange} />
            ) : (
                <div className="h-96 flex items-center justify-center bg-muted rounded-lg"><Loader2 className="w-8 h-8 animate-spin"/></div>
            )}
        </>
    );
}
