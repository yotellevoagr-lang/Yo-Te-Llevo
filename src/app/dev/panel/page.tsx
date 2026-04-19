
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
    Shield, ArrowLeft, MessageCircle, Gift, FileText,
    Settings2, Eye, EyeOff, Loader2, Building2, Receipt
} from "lucide-react";
import { getDocumentById, saveDocument } from "@/lib/firestore-services";
import type { GeneralSettings } from "@/lib/types";

export default function DevPanelPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [features, setFeatures] = useState({
        showCommunity: false,
        showBenefits: false,
        showBilling: false,
    });

    useEffect(() => {
        const load = async () => {
            try {
                const settings = await getDocumentById<GeneralSettings>('settings', 'general');
                if (settings?.devFeatures) {
                    setFeatures({
                        showCommunity: settings.devFeatures.showCommunity ?? false,
                        showBenefits: settings.devFeatures.showBenefits ?? false,
                        showBilling: settings.devFeatures.showBilling ?? false,
                    });
                }
            } catch {
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const handleSave = async () => {
        setSaving(true);
        try {
            const current = await getDocumentById<GeneralSettings>('settings', 'general') || {};
            await saveDocument('settings', { ...current, devFeatures: features }, 'general');
            window.dispatchEvent(new Event('storage'));
            toast({ title: "Guardado", description: "Configuración del panel guardada correctamente." });
        } catch {
            toast({ title: "Error", description: "No se pudo guardar la configuración.", variant: "destructive" });
        } finally {
            setSaving(false);
        }
    };

    const handleExit = () => {
        sessionStorage.removeItem('ytl_dev_access');
        router.replace('/admin/dashboard/settings');
    };

    return (
        <div className="max-w-3xl mx-auto p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Shield className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold">Panel de Programador</h1>
                        <p className="text-sm text-muted-foreground">Solo vos podés ver esto</p>
                    </div>
                </div>
                <Button variant="outline" size="sm" onClick={handleExit}>
                    <ArrowLeft className="w-4 h-4 mr-2" /> Salir
                </Button>
            </div>

            <Separator />

            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
            ) : (
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Settings2 className="w-5 h-5" /> Control de funcionalidades
                            </CardTitle>
                            <CardDescription>
                                Activá o desactivá las secciones que se muestran en el panel del administrador. Solo vos podés acceder a estas funciones cuando están desactivadas.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-5">
                            <div className="flex items-center justify-between rounded-lg border p-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                                        <MessageCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                    </div>
                                    <div>
                                        <Label className="text-base font-semibold">Comunidad</Label>
                                        <p className="text-sm text-muted-foreground">Feed de publicaciones, reacciones y comentarios</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Badge variant={features.showCommunity ? "default" : "secondary"}>
                                        {features.showCommunity ? <><Eye className="w-3 h-3 mr-1" /> Visible</> : <><EyeOff className="w-3 h-3 mr-1" /> Oculto</>}
                                    </Badge>
                                    <Switch
                                        checked={features.showCommunity}
                                        onCheckedChange={v => setFeatures(f => ({ ...f, showCommunity: v }))}
                                    />
                                </div>
                            </div>

                            <div className="flex items-center justify-between rounded-lg border p-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-full bg-amber-100 dark:bg-amber-900 flex items-center justify-center">
                                        <Gift className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                                    </div>
                                    <div>
                                        <Label className="text-base font-semibold">Beneficios</Label>
                                        <p className="text-sm text-muted-foreground">Sistema de cupones y descuentos para clientes</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Badge variant={features.showBenefits ? "default" : "secondary"}>
                                        {features.showBenefits ? <><Eye className="w-3 h-3 mr-1" /> Visible</> : <><EyeOff className="w-3 h-3 mr-1" /> Oculto</>}
                                    </Badge>
                                    <Switch
                                        checked={features.showBenefits}
                                        onCheckedChange={v => setFeatures(f => ({ ...f, showBenefits: v }))}
                                    />
                                </div>
                            </div>

                            <div className="flex items-center justify-between rounded-lg border p-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                                        <Receipt className="w-5 h-5 text-green-600 dark:text-green-400" />
                                    </div>
                                    <div>
                                        <Label className="text-base font-semibold">Facturación ARCA</Label>
                                        <p className="text-sm text-muted-foreground">Módulo de facturación electrónica (en desarrollo)</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Badge variant={features.showBilling ? "default" : "secondary"}>
                                        {features.showBilling ? <><Eye className="w-3 h-3 mr-1" /> Visible</> : <><EyeOff className="w-3 h-3 mr-1" /> Oculto</>}
                                    </Badge>
                                    <Switch
                                        checked={features.showBilling}
                                        onCheckedChange={v => setFeatures(f => ({ ...f, showBilling: v }))}
                                    />
                                </div>
                            </div>

                            <Button onClick={handleSave} disabled={saving} className="w-full">
                                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                Guardar cambios
                            </Button>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Building2 className="w-5 h-5" /> Facturación ARCA
                                <Badge variant="outline" className="ml-2 text-xs">En desarrollo</Badge>
                            </CardTitle>
                            <CardDescription>
                                Módulo de facturación electrónica vinculado al sistema ARCA (ex-AFIP). Solo disponible para vos mientras lo desarrollás.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="rounded-lg bg-muted/50 border border-dashed p-6 text-center space-y-3">
                                <FileText className="w-10 h-10 mx-auto text-muted-foreground" />
                                <div>
                                    <p className="font-semibold">Próximamente: Facturación Electrónica</p>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        Acá vas a poder emitir facturas electrónicas tipo A, B y C directamente desde el sistema, integrado con el servicio web de ARCA (ex-AFIP). No incluye medios de pago por ahora, solo facturación.
                                    </p>
                                </div>
                                <div className="flex flex-wrap gap-2 justify-center mt-2">
                                    <Badge variant="outline">Factura A / B / C</Badge>
                                    <Badge variant="outline">CUIT empresa</Badge>
                                    <Badge variant="outline">Punto de venta</Badge>
                                    <Badge variant="outline">CAE automático</Badge>
                                    <Badge variant="outline">PDF descargable</Badge>
                                </div>
                            </div>
                            <p className="text-xs text-muted-foreground text-center">
                                Esta sección está oculta para el administrador hasta que vos la actives. Requiere credenciales de ARCA para funcionar.
                            </p>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
