"use client"

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { MapPin, Hand, Check } from "lucide-react";

interface GeoAccessPromptProps {
    isOpen: boolean;
    onAllow: () => void;
    onManualSubmit: (province: string, city: string) => void;
    onDeny: () => void;
}

export function GeoAccessPrompt({ isOpen, onAllow, onManualSubmit, onDeny }: GeoAccessPromptProps) {
    const [showManualForm, setShowManualForm] = useState(false);
    const [province, setProvince] = useState("Santa Fe");
    const [city, setCity] = useState("");

    const handleManualSubmit = () => {
        if (province && city) {
            onManualSubmit(province, city);
        }
    }

    const handleAllow = () => {
        onAllow();
    }

    const handleDeny = () => {
        onDeny();
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && handleDeny()}>
            <DialogContent className="sm:max-w-md" hideCloseButton={true}>
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl"><MapPin className="w-6 h-6 text-primary"/> Verificación de Zona de Servicio</DialogTitle>
                    <DialogDescription className="pt-2">
                        Por razones operativas, nuestra venta online está habilitada para la zona de San Lorenzo, Santa Fe y alrededores.
                    </DialogDescription>
                </DialogHeader>
                
                <div className="py-4 space-y-4">
                    <p className="text-sm text-muted-foreground">
                        Detectamos que podrías estar fuera de esta área. Para asegurar que podemos brindarte el mejor servicio, por favor, ayúdanos a confirmar tu ubicación.
                    </p>

                    {showManualForm ? (
                        <div className="p-4 border rounded-lg bg-muted/50 space-y-4 animate-fade-in-up">
                            <h4 className="font-semibold">Ingreso Manual</h4>
                            <div className="space-y-2">
                                <Label htmlFor="province">Provincia</Label>
                                <Input id="province" value={province} onChange={(e) => setProvince(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="city">Localidad</Label>
                                <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} />
                            </div>
                             <Button onClick={handleManualSubmit} className="w-full">
                                <Check className="mr-2"/>
                                Comprobar Ubicación
                            </Button>
                        </div>
                    ) : (
                         <div className="grid grid-cols-1 gap-3">
                            <Button onClick={handleAllow} size="lg">
                                <MapPin className="mr-2"/>
                                Permitir Ubicación
                            </Button>
                            <Button onClick={() => setShowManualForm(true)} variant="secondary" size="lg">
                                <Hand className="mr-2"/>
                                Ingresar Manualmente
                            </Button>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="link" className="w-full text-muted-foreground" onClick={handleDeny}>
                        Entendido, solo quiero explorar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
