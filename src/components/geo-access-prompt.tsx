"use client"

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { MapPin } from "lucide-react";
import { useAuth } from "./auth/auth-provider";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "./ui/card";

interface GeoVerificationCardProps {
    onAllow: () => void;
    onManualSubmit: (province: string, city: string) => void;
}

export function GeoVerificationCard({ onAllow, onManualSubmit }: GeoVerificationCardProps) {
    const { user } = useAuth();
    const [province, setProvince] = useState("");
    const [city, setCity] = useState("");

    const handleManualSubmit = () => {
        if (province && city) {
            onManualSubmit(province, city);
        }
    };

    return (
        <Card className="border-primary bg-primary/5 animate-fade-in-up">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-primary">
                    <MapPin className="w-6 h-6"/>
                    Verificación de Zona de Servicio
                </CardTitle>
                <CardDescription className="text-primary/90">
                    Nuestra venta online está habilitada principalmente para la zona de San Lorenzo, Santa Fe y alrededores. 
                    Para poder solicitar tu reserva, por favor, ayúdanos a confirmar tu ubicación.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <Button onClick={onAllow} size="lg" className="w-full">
                    Usar Ubicación
                </Button>
                
                <div className="relative flex items-center">
                    <div className="flex-grow border-t border-muted-foreground/30"></div>
                    <span className="flex-shrink mx-4 text-xs text-muted-foreground uppercase">O</span>
                    <div className="flex-grow border-t border-muted-foreground/30"></div>
                </div>

                <div className="space-y-3">
                    <Label className="font-semibold text-center block">Ingresa tu ubicación manualmente:</Label>
                     {!user && (
                        <p className="text-xs text-muted-foreground italic text-center">
                            ¿Quieres guardar tu dirección? 
                            <Link href="/login?mode=register" className="font-semibold text-primary hover:underline"> Regístrate</Link>, ¡es rápido y fácil!
                        </p>
                    )}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <Label htmlFor="province">Provincia</Label>
                            <Input id="province" value={province} onChange={(e) => setProvince(e.target.value)} />
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="city">Localidad</Label>
                            <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} />
                        </div>
                    </div>
                    <Button onClick={handleManualSubmit} variant="secondary" className="w-full">
                        Comprobar Ubicación Manual
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
