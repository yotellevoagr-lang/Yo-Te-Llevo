
"use client";

import { useState, useEffect, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
    Receipt, Settings2, Plus, Download, CheckCircle2, XCircle,
    Loader2, Wifi, WifiOff, FileText, Building2, Hash, Calendar,
    User, DollarSign, RefreshCw, AlertTriangle, Info
} from "lucide-react";
import { getDocumentById, saveDocument } from "@/lib/firestore-services";
import { addDoc, collection, orderBy, query, getDocs, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { ArcaSettings, ArcaInvoice } from "@/lib/types";
import {
    VOUCHER_TYPES, DOC_TYPES, IVA_CONDITIONS, IVA_RATES,
    formatCuit, arcaDateToDisplay,
} from "@/lib/arca-service";
import jsPDF from "jspdf";

const DEFAULT_SETTINGS: ArcaSettings = {
    razonSocial: '',
    cuit: '',
    domicilio: '',
    ciudad: '',
    provincia: 'Buenos Aires',
    ivaCondition: '6',
    puntoVenta: 1,
    defaultVoucherType: 11,
    mode: 'homo',
};

function formatInvoiceNumber(puntoVenta: number, invoiceNumber: number): string {
    return `${String(puntoVenta).padStart(4, '0')}-${String(invoiceNumber).padStart(8, '0')}`;
}

function todayInput(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function inputToArcaDate(s: string): string {
    return s.replace(/-/g, '');
}

function generateInvoicePDF(invoice: ArcaInvoice, settings: ArcaSettings) {
    const pdf = new jsPDF({ format: 'a4', unit: 'mm' });
    const W = 210;
    let y = 15;

    const line = (x1: number, y1: number, x2: number, y2: number) => pdf.line(x1, y1, x2, y2);
    const text = (t: string, x: number, yPos: number, opts?: any) => pdf.text(t, x, yPos, opts);

    pdf.setFontSize(20);
    pdf.setFont('helvetica', 'bold');
    text(settings.razonSocial || 'YO TE LLEVO', 15, y);

    const tipoCbte = VOUCHER_TYPES[invoice.invoiceType] || `Tipo ${invoice.invoiceType}`;
    const letraCbte = tipoCbte.slice(-1);

    pdf.setDrawColor(0);
    pdf.setLineWidth(0.5);
    pdf.rect(W / 2 - 10, 10, 20, 14);
    pdf.setFontSize(22);
    pdf.setFont('helvetica', 'bold');
    text(letraCbte, W / 2, 20, { align: 'center' });

    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    text(tipoCbte, W / 2, 27, { align: 'center' });

    y = 20;
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    text('Punto de Venta:', W / 2 + 15, y);
    text(`${String(invoice.puntoVenta).padStart(4, '0')}`, W / 2 + 47, y);
    y += 6;
    text('Comp. Nro:', W / 2 + 15, y);
    text(`${String(invoice.invoiceNumber).padStart(8, '0')}`, W / 2 + 47, y);
    y += 6;
    text('Fecha:', W / 2 + 15, y);
    text(arcaDateToDisplay(invoice.date), W / 2 + 47, y);
    y = 32;

    line(15, y, W - 15, y);
    y += 8;

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);
    text('Razón Social:', 15, y);
    pdf.setFont('helvetica', 'normal');
    text(settings.razonSocial || '', 45, y);
    y += 6;
    pdf.setFont('helvetica', 'bold');
    text('CUIT:', 15, y);
    pdf.setFont('helvetica', 'normal');
    text(formatCuit(settings.cuit || ''), 30, y);
    y += 6;
    pdf.setFont('helvetica', 'bold');
    text('Domicilio:', 15, y);
    pdf.setFont('helvetica', 'normal');
    text(`${settings.domicilio || ''}, ${settings.ciudad || ''}, ${settings.provincia || ''}`, 38, y);
    y += 6;
    pdf.setFont('helvetica', 'bold');
    text('Condición IVA:', 15, y);
    pdf.setFont('helvetica', 'normal');
    text(IVA_CONDITIONS[settings.ivaCondition || '6'] || '', 50, y);

    if (invoice.mode === 'homo') {
        pdf.setFontSize(8);
        pdf.setTextColor(180, 0, 0);
        text('⚠ DOCUMENTO EN MODO HOMOLOGACIÓN — NO VÁLIDO COMO COMPROBANTE FISCAL', 15, y + 8);
        pdf.setTextColor(0, 0, 0);
        y += 8;
    }
    y += 10;

    line(15, y, W - 15, y);
    y += 8;

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);
    text('DATOS DEL CLIENTE', 15, y);
    y += 7;
    pdf.setFont('helvetica', 'normal');
    text(`Nombre/Razón Social: ${invoice.clientName}`, 15, y);
    y += 6;
    text(`${DOC_TYPES[invoice.clientDocType] || 'Documento'}: ${invoice.clientDocNumber || 'Consumidor Final'}`, 15, y);
    y += 10;

    line(15, y, W - 15, y);
    y += 8;

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);
    const colDesc = 15, colQty = 110, colUnit = 135, colTotal = 165;
    text('Descripción', colDesc, y);
    text('Cant.', colQty, y);
    text('Precio Unit.', colUnit, y);
    text('Subtotal', colTotal, y);
    y += 2;
    line(15, y, W - 15, y);
    y += 7;

    pdf.setFont('helvetica', 'normal');
    for (const item of invoice.items) {
        const lines = pdf.splitTextToSize(item.description, 90);
        text(lines, colDesc, y);
        text(String(item.quantity), colQty, y);
        text(`$${item.unitPrice.toFixed(2)}`, colUnit, y);
        text(`$${item.subtotal.toFixed(2)}`, colTotal, y);
        y += 6 * lines.length + 2;
    }

    if (invoice.serviceFrom) {
        y += 2;
        pdf.setFontSize(9);
        text(`Período del servicio: ${arcaDateToDisplay(invoice.serviceFrom)} al ${arcaDateToDisplay(invoice.serviceTo || invoice.serviceFrom)}`, 15, y);
        y += 6;
        pdf.setFontSize(10);
    }

    line(15, y, W - 15, y);
    y += 8;

    const totX = 130;
    if (invoice.ivaAmount > 0) {
        text(`Subtotal Neto:`, totX, y);
        text(`$${invoice.subtotal.toFixed(2)}`, W - 15, y, { align: 'right' });
        y += 6;
        text(`IVA (${IVA_RATES[invoice.items[0]?.ivaRate] || '21%'}):`, totX, y);
        text(`$${invoice.ivaAmount.toFixed(2)}`, W - 15, y, { align: 'right' });
        y += 6;
    }
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(12);
    text('TOTAL:', totX, y);
    text(`$${invoice.total.toFixed(2)}`, W - 15, y, { align: 'right' });
    y += 15;

    pdf.setDrawColor(100, 100, 100);
    pdf.setLineWidth(0.3);
    line(15, y, W - 15, y);
    y += 8;

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9);
    pdf.setTextColor(60, 60, 60);
    text('COMPROBANTE AUTORIZADO POR ARCA', 15, y);
    y += 6;
    pdf.setFont('helvetica', 'normal');
    text(`CAE N°: ${invoice.cae}`, 15, y);
    y += 5;
    text(`Vencimiento CAE: ${invoice.caeExpiration}`, 15, y);
    y += 5;
    text(`N° Comprobante: ${formatInvoiceNumber(invoice.puntoVenta, invoice.invoiceNumber)}`, 15, y);
    pdf.setTextColor(0, 0, 0);

    const filename = `Factura_${letraCbte}_${formatInvoiceNumber(invoice.puntoVenta, invoice.invoiceNumber)}.pdf`;
    pdf.save(filename);
}

export default function BillingPage() {
    const { toast } = useToast();
    const [tab, setTab] = useState<'config' | 'new' | 'history'>('config');
    const [loadingSettings, setLoadingSettings] = useState(true);
    const [savingSettings, setSavingSettings] = useState(false);
    const [settings, setSettings] = useState<ArcaSettings>(DEFAULT_SETTINGS);
    const [invoices, setInvoices] = useState<ArcaInvoice[]>([]);
    const [loadingInvoices, setLoadingInvoices] = useState(false);
    const [testResult, setTestResult] = useState<{ success: boolean; message: string; hasCert: boolean } | null>(null);
    const [testingConn, setTestingConn] = useState(false);
    const [issuingInvoice, setIssuingInvoice] = useState(false);
    const [viewingInvoice, setViewingInvoice] = useState<ArcaInvoice | null>(null);

    const [form, setForm] = useState({
        tipoComprobante: '11',
        docTipo: '96',
        docNro: '',
        clientName: '',
        concepto: '2',
        description: 'Servicio de viaje y turismo',
        quantity: '1',
        unitPrice: '',
        ivaRate: '0',
        serviceFrom: todayInput(),
        serviceTo: todayInput(),
        observations: '',
    });

    useEffect(() => {
        const load = async () => {
            try {
                const s = await getDocumentById<ArcaSettings>('settings', 'arca');
                if (s) setSettings({ ...DEFAULT_SETTINGS, ...s });
            } catch {}
            setLoadingSettings(false);
        };
        load();
    }, []);

    const loadInvoices = useCallback(async () => {
        setLoadingInvoices(true);
        try {
            const q = query(collection(db, 'invoices'), orderBy('createdAt', 'desc'), limit(100));
            const snap = await getDocs(q);
            setInvoices(snap.docs.map(d => ({ id: d.id, ...d.data() }) as ArcaInvoice));
        } catch {
            setInvoices([]);
        }
        setLoadingInvoices(false);
    }, []);

    useEffect(() => {
        if (tab === 'history') loadInvoices();
    }, [tab, loadInvoices]);

    const handleSaveSettings = async () => {
        setSavingSettings(true);
        try {
            await saveDocument('settings', settings, 'arca');
            toast({ title: "Configuración guardada", description: "Los datos de la empresa fueron actualizados." });
        } catch {
            toast({ title: "Error", description: "No se pudo guardar la configuración.", variant: "destructive" });
        }
        setSavingSettings(false);
    };

    const handleTestConnection = async () => {
        setTestingConn(true);
        setTestResult(null);
        try {
            const res = await fetch('/api/arca/test-connection', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mode: settings.mode }),
            });
            const data = await res.json();
            setTestResult(data);
        } catch (err: any) {
            setTestResult({ success: false, hasCert: false, message: 'Error de red: ' + err.message });
        }
        setTestingConn(false);
    };

    const computeTotals = () => {
        const qty = parseFloat(form.quantity) || 1;
        const unit = parseFloat(form.unitPrice) || 0;
        const subtotal = qty * unit;
        const tipoNum = parseInt(form.tipoComprobante);
        const ivaRate = (tipoNum === 11) ? 0 : (parseFloat(form.ivaRate) || 0);
        const ivaAmount = subtotal * (ivaRate / 100);
        const total = subtotal + ivaAmount;
        return { subtotal, ivaAmount, total, ivaRate };
    };

    const handleIssueInvoice = async () => {
        const { subtotal, ivaAmount, total, ivaRate } = computeTotals();
        if (!form.clientName.trim()) {
            toast({ title: "Datos incompletos", description: "Ingresá el nombre del cliente.", variant: "destructive" });
            return;
        }
        if (!form.unitPrice || parseFloat(form.unitPrice) <= 0) {
            toast({ title: "Datos incompletos", description: "Ingresá el importe.", variant: "destructive" });
            return;
        }

        const tipoNum = parseInt(form.tipoComprobante);
        const docTipoNum = parseInt(form.docTipo);
        const ivaItems = ivaRate > 0 ? [{
            id: ivaRate === 21 ? 5 : ivaRate === 10.5 ? 4 : 6,
            baseImp: subtotal,
            importe: ivaAmount,
        }] : [];

        setIssuingInvoice(true);
        try {
            const res = await fetch('/api/arca/invoice', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    mode: settings.mode,
                    cuit: settings.cuit?.replace(/-/g, ''),
                    puntoVenta: settings.puntoVenta,
                    tipoComprobante: tipoNum,
                    concepto: parseInt(form.concepto),
                    docTipo: docTipoNum,
                    docNro: docTipoNum === 0 ? '0' : form.docNro.replace(/\D/g, ''),
                    impTotal: total,
                    impNeto: subtotal,
                    impIVA: ivaAmount,
                    impTrib: 0,
                    impOpEx: 0,
                    fchServDesde: inputToArcaDate(form.serviceFrom),
                    fchServHasta: inputToArcaDate(form.serviceTo),
                    fchVtoPago: inputToArcaDate(form.serviceTo),
                    ivaItems,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            const invoiceData: ArcaInvoice = {
                invoiceNumber: data.invoiceNumber,
                invoiceType: tipoNum,
                invoiceTypeName: VOUCHER_TYPES[tipoNum] || `Tipo ${tipoNum}`,
                puntoVenta: settings.puntoVenta || 1,
                cae: data.cae,
                caeExpiration: data.caeExpiration,
                clientName: form.clientName,
                clientDocType: docTipoNum,
                clientDocTypeName: DOC_TYPES[docTipoNum] || '',
                clientDocNumber: form.docNro,
                concept: parseInt(form.concepto),
                items: [{
                    description: form.description,
                    quantity: parseFloat(form.quantity) || 1,
                    unitPrice: parseFloat(form.unitPrice) || 0,
                    ivaRate,
                    subtotal,
                }],
                subtotal,
                ivaAmount,
                total,
                date: data.fecha,
                serviceFrom: inputToArcaDate(form.serviceFrom),
                serviceTo: inputToArcaDate(form.serviceTo),
                mode: settings.mode || 'homo',
                observations: form.observations,
                createdAt: new Date().toISOString(),
            };

            await addDoc(collection(db, 'invoices'), invoiceData);

            toast({
                title: "✅ Factura emitida correctamente",
                description: `CAE: ${data.cae} — Vence: ${data.caeExpiration}`,
            });

            setViewingInvoice(invoiceData);
            generateInvoicePDF(invoiceData, settings);

            setForm(f => ({
                ...f,
                docNro: '', clientName: '', unitPrice: '', observations: '',
                serviceFrom: todayInput(), serviceTo: todayInput(),
            }));
        } catch (err: any) {
            toast({ title: "Error al emitir", description: err.message, variant: "destructive" });
        }
        setIssuingInvoice(false);
    };

    const { subtotal, ivaAmount, total } = computeTotals();
    const tipoNum = parseInt(form.tipoComprobante);
    const isMonotrib = tipoNum === 11;

    if (loadingSettings) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-5xl">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Receipt className="w-6 h-6 text-primary" /> Facturación Electrónica ARCA
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Emisión de comprobantes electrónicos según normativa de ARCA (ex-AFIP) — Argentina
                    </p>
                </div>
                <Badge variant={settings.mode === 'prod' ? 'default' : 'secondary'} className="text-sm px-3 py-1">
                    {settings.mode === 'prod' ? '🟢 Producción' : '🟡 Homologación'}
                </Badge>
            </div>

            <Tabs value={tab} onValueChange={v => setTab(v as any)}>
                <TabsList className="grid grid-cols-3 w-full max-w-lg">
                    <TabsTrigger value="config"><Settings2 className="w-4 h-4 mr-2" />Configuración</TabsTrigger>
                    <TabsTrigger value="new"><Plus className="w-4 h-4 mr-2" />Nueva Factura</TabsTrigger>
                    <TabsTrigger value="history"><FileText className="w-4 h-4 mr-2" />Historial</TabsTrigger>
                </TabsList>

                <TabsContent value="config" className="space-y-6 mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Building2 className="w-5 h-5" /> Datos de la Empresa</CardTitle>
                            <CardDescription>Información que aparece en las facturas emitidas.</CardDescription>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Razón Social *</Label>
                                <Input value={settings.razonSocial || ''} onChange={e => setSettings(s => ({ ...s, razonSocial: e.target.value }))} placeholder="YO TE LLEVO S.A.S." />
                            </div>
                            <div className="space-y-2">
                                <Label>CUIT *</Label>
                                <Input value={settings.cuit || ''} onChange={e => setSettings(s => ({ ...s, cuit: e.target.value }))} placeholder="30-71234567-9" />
                                {settings.cuit && <p className="text-xs text-muted-foreground">{formatCuit(settings.cuit)}</p>}
                            </div>
                            <div className="space-y-2 md:col-span-2">
                                <Label>Domicilio Comercial</Label>
                                <Input value={settings.domicilio || ''} onChange={e => setSettings(s => ({ ...s, domicilio: e.target.value }))} placeholder="Av. Corrientes 1234, Piso 3" />
                            </div>
                            <div className="space-y-2">
                                <Label>Ciudad</Label>
                                <Input value={settings.ciudad || ''} onChange={e => setSettings(s => ({ ...s, ciudad: e.target.value }))} placeholder="Buenos Aires" />
                            </div>
                            <div className="space-y-2">
                                <Label>Provincia</Label>
                                <Input value={settings.provincia || ''} onChange={e => setSettings(s => ({ ...s, provincia: e.target.value }))} placeholder="Buenos Aires" />
                            </div>
                            <div className="space-y-2">
                                <Label>Condición frente al IVA</Label>
                                <Select value={settings.ivaCondition || '6'} onValueChange={v => setSettings(s => ({ ...s, ivaCondition: v }))}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {Object.entries(IVA_CONDITIONS).map(([k, v]) => (
                                            <SelectItem key={k} value={k}>{v}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Punto de Venta *</Label>
                                <Input type="number" min={1} value={settings.puntoVenta || 1} onChange={e => setSettings(s => ({ ...s, puntoVenta: parseInt(e.target.value) || 1 }))} />
                                <p className="text-xs text-muted-foreground">Debe estar registrado en ARCA</p>
                            </div>
                            <div className="space-y-2">
                                <Label>Tipo de factura predeterminado</Label>
                                <Select value={String(settings.defaultVoucherType || 11)} onValueChange={v => setSettings(s => ({ ...s, defaultVoucherType: parseInt(v) }))}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="11">Factura C (Monotributista)</SelectItem>
                                        <SelectItem value="6">Factura B (Responsable Inscripto → Consumidor Final)</SelectItem>
                                        <SelectItem value="1">Factura A (Responsable Inscripto → RI)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Modo de operación</Label>
                                <Select value={settings.mode || 'homo'} onValueChange={v => setSettings(s => ({ ...s, mode: v as 'homo' | 'prod' }))}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="homo">🟡 Homologación (Pruebas)</SelectItem>
                                        <SelectItem value="prod">🟢 Producción</SelectItem>
                                    </SelectContent>
                                </Select>
                                {settings.mode === 'prod' && (
                                    <p className="text-xs text-amber-600 font-medium">⚠ En modo producción las facturas son documentos fiscales reales.</p>
                                )}
                            </div>
                        </CardContent>
                        <div className="px-6 pb-6">
                            <Button onClick={handleSaveSettings} disabled={savingSettings}>
                                {savingSettings && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                Guardar configuración
                            </Button>
                        </div>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Hash className="w-5 h-5" /> Certificado Digital ARCA</CardTitle>
                            <CardDescription>
                                El certificado y la clave privada son necesarios para autenticarte con los servicios web de ARCA.
                                Se configuran como secretos de entorno por seguridad — no se almacenan en la base de datos.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
                                <p className="font-semibold text-sm">Pasos para configurar el certificado:</p>
                                <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                                    <li>Ingresá al portal de ARCA: <span className="font-mono text-xs bg-muted px-1 rounded">serviciosweb.afip.gov.ar</span></li>
                                    <li>Crea un Certificado Digital para el servicio <strong>wsfe</strong></li>
                                    <li>Descargá el archivo <strong>.crt</strong> (certificado) y guardá la <strong>clave privada</strong></li>
                                    <li>Convertí ambos a base64:<br />
                                        <code className="text-xs bg-muted px-2 py-1 rounded block mt-1">cat certificado.crt | base64 -w0</code>
                                        <code className="text-xs bg-muted px-2 py-1 rounded block mt-1">cat clave_privada.key | base64 -w0</code>
                                    </li>
                                    <li>En Replit, andá a <strong>Secrets</strong> y creá:<br />
                                        <code className="text-xs bg-muted px-2 py-1 rounded block mt-1">ARCA_CERT = [base64 del certificado]</code>
                                        <code className="text-xs bg-muted px-2 py-1 rounded block mt-1">ARCA_PRIVATE_KEY = [base64 de la clave privada]</code>
                                    </li>
                                </ol>
                            </div>

                            <div className="flex gap-3 items-center flex-wrap">
                                <Button variant="outline" onClick={handleTestConnection} disabled={testingConn}>
                                    {testingConn
                                        ? <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        : <Wifi className="w-4 h-4 mr-2" />}
                                    Probar conexión con ARCA
                                </Button>
                                {testResult && (
                                    <div className={`flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg ${testResult.success ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                                        {testResult.success
                                            ? <CheckCircle2 className="w-4 h-4" />
                                            : testResult.hasCert ? <XCircle className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
                                        {testResult.message}
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="new" className="space-y-5 mt-4">
                    {viewingInvoice && (
                        <Card className="border-green-300 bg-green-50 dark:bg-green-900/20">
                            <CardContent className="pt-4">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                        <CheckCircle2 className="w-8 h-8 text-green-600 shrink-0" />
                                        <div>
                                            <p className="font-bold text-green-800 dark:text-green-300">¡Factura emitida y descargada!</p>
                                            <p className="text-sm text-green-700 dark:text-green-400">
                                                {viewingInvoice.invoiceTypeName} {formatInvoiceNumber(viewingInvoice.puntoVenta, viewingInvoice.invoiceNumber)} — CAE: {viewingInvoice.cae}
                                            </p>
                                            <p className="text-sm text-green-700 dark:text-green-400">Vencimiento CAE: {viewingInvoice.caeExpiration}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button size="sm" variant="outline" onClick={() => generateInvoicePDF(viewingInvoice, settings)}>
                                            <Download className="w-4 h-4 mr-1" /> Descargar PDF
                                        </Button>
                                        <Button size="sm" variant="ghost" onClick={() => setViewingInvoice(null)}>✕</Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {settings.mode === 'homo' && (
                        <div className="flex items-center gap-2 text-amber-700 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-300 rounded-lg px-4 py-3 text-sm">
                            <AlertTriangle className="w-4 h-4 shrink-0" />
                            <span>Modo Homologación activo — Las facturas generadas son de prueba y no tienen validez fiscal.</span>
                        </div>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                        <div className="lg:col-span-2 space-y-5">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base flex items-center gap-2"><FileText className="w-4 h-4" /> Tipo de Comprobante</CardTitle>
                                </CardHeader>
                                <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Tipo de factura</Label>
                                        <Select value={form.tipoComprobante} onValueChange={v => setForm(f => ({ ...f, tipoComprobante: v, ivaRate: v === '11' ? '0' : f.ivaRate }))}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="11">Factura C (Monotributista)</SelectItem>
                                                <SelectItem value="6">Factura B (Resp. Inscripto → Consumidor)</SelectItem>
                                                <SelectItem value="1">Factura A (Resp. Inscripto → RI)</SelectItem>
                                                <SelectItem value="13">Nota de Crédito C</SelectItem>
                                                <SelectItem value="8">Nota de Crédito B</SelectItem>
                                                <SelectItem value="3">Nota de Crédito A</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Concepto</Label>
                                        <Select value={form.concepto} onValueChange={v => setForm(f => ({ ...f, concepto: v }))}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="2">Servicios</SelectItem>
                                                <SelectItem value="1">Productos</SelectItem>
                                                <SelectItem value="3">Productos y Servicios</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base flex items-center gap-2"><User className="w-4 h-4" /> Datos del Cliente</CardTitle>
                                </CardHeader>
                                <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Tipo de documento</Label>
                                        <Select value={form.docTipo} onValueChange={v => setForm(f => ({ ...f, docTipo: v, docNro: v === '0' ? '' : f.docNro }))}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="0">Sin documento / Consumidor Final</SelectItem>
                                                <SelectItem value="96">DNI</SelectItem>
                                                <SelectItem value="80">CUIT</SelectItem>
                                                <SelectItem value="86">CUIL</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    {form.docTipo !== '0' && (
                                        <div className="space-y-2">
                                            <Label>N° de documento *</Label>
                                            <Input value={form.docNro} onChange={e => setForm(f => ({ ...f, docNro: e.target.value }))} placeholder="12345678" />
                                        </div>
                                    )}
                                    <div className={`space-y-2 ${form.docTipo === '0' ? 'sm:col-span-2' : 'sm:col-span-2'}`}>
                                        <Label>Nombre / Razón Social *</Label>
                                        <Input value={form.clientName} onChange={e => setForm(f => ({ ...f, clientName: e.target.value }))} placeholder="Juan Pérez" />
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base flex items-center gap-2"><DollarSign className="w-4 h-4" /> Detalle del Servicio</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>Descripción del servicio *</Label>
                                        <Textarea
                                            value={form.description}
                                            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                                            placeholder="Ej: Viaje grupal a Bariloche — Tour 5 días..."
                                            rows={2}
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                        <div className="space-y-2">
                                            <Label>Cantidad</Label>
                                            <Input type="number" min={1} value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} />
                                        </div>
                                        <div className="space-y-2 sm:col-span-2">
                                            <Label>Precio unitario (ARS) *</Label>
                                            <Input type="number" min={0} step="0.01" value={form.unitPrice} onChange={e => setForm(f => ({ ...f, unitPrice: e.target.value }))} placeholder="0.00" />
                                        </div>
                                        {!isMonotrib && (
                                            <div className="space-y-2">
                                                <Label>IVA</Label>
                                                <Select value={form.ivaRate} onValueChange={v => setForm(f => ({ ...f, ivaRate: v }))}>
                                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="0">0% (Exento)</SelectItem>
                                                        <SelectItem value="10.5">10.5%</SelectItem>
                                                        <SelectItem value="21">21%</SelectItem>
                                                        <SelectItem value="27">27%</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        )}
                                    </div>
                                    {parseInt(form.concepto) !== 1 && (
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label className="flex items-center gap-1"><Calendar className="w-3 h-3" /> Período desde</Label>
                                                <Input type="date" value={form.serviceFrom} onChange={e => setForm(f => ({ ...f, serviceFrom: e.target.value }))} />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="flex items-center gap-1"><Calendar className="w-3 h-3" /> Período hasta</Label>
                                                <Input type="date" value={form.serviceTo} onChange={e => setForm(f => ({ ...f, serviceTo: e.target.value }))} />
                                            </div>
                                        </div>
                                    )}
                                    <div className="space-y-2">
                                        <Label>Observaciones (opcional)</Label>
                                        <Input value={form.observations} onChange={e => setForm(f => ({ ...f, observations: e.target.value }))} placeholder="Reserva N° 123 — Viaje de enero" />
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        <div className="space-y-5">
                            <Card className="sticky top-4">
                                <CardHeader>
                                    <CardTitle className="text-base">Resumen</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <div className="text-sm space-y-2">
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Tipo:</span>
                                            <span className="font-medium">{VOUCHER_TYPES[parseInt(form.tipoComprobante)]}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Cliente:</span>
                                            <span className="font-medium text-right max-w-[130px] truncate">{form.clientName || '—'}</span>
                                        </div>
                                        <Separator />
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Subtotal:</span>
                                            <span>${subtotal.toFixed(2)}</span>
                                        </div>
                                        {!isMonotrib && (
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">IVA ({form.ivaRate}%):</span>
                                                <span>${ivaAmount.toFixed(2)}</span>
                                            </div>
                                        )}
                                        <Separator />
                                        <div className="flex justify-between text-base font-bold">
                                            <span>Total:</span>
                                            <span className="text-primary">${total.toFixed(2)}</span>
                                        </div>
                                    </div>
                                    <div className="pt-2 space-y-2">
                                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                                            <Info className="w-3 h-3" />
                                            Punto de venta: {String(settings.puntoVenta || 1).padStart(4, '0')} · Modo: {settings.mode === 'prod' ? 'Producción' : 'Homologación'}
                                        </div>
                                        <Button className="w-full" onClick={handleIssueInvoice} disabled={issuingInvoice}>
                                            {issuingInvoice
                                                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Emitiendo...</>
                                                : <><Receipt className="w-4 h-4 mr-2" /> Emitir Factura</>}
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="history" className="mt-4">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="flex items-center gap-2"><FileText className="w-5 h-5" /> Historial de Comprobantes</CardTitle>
                                    <CardDescription>Todos los comprobantes emitidos, guardados localmente.</CardDescription>
                                </div>
                                <Button variant="outline" size="sm" onClick={loadInvoices} disabled={loadingInvoices}>
                                    {loadingInvoices ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {loadingInvoices ? (
                                <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
                            ) : invoices.length === 0 ? (
                                <div className="text-center py-12 text-muted-foreground">
                                    <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
                                    <p>No hay comprobantes emitidos todavía.</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b text-left text-muted-foreground">
                                                <th className="pb-3 pr-4">N° Comp.</th>
                                                <th className="pb-3 pr-4">Tipo</th>
                                                <th className="pb-3 pr-4">Fecha</th>
                                                <th className="pb-3 pr-4">Cliente</th>
                                                <th className="pb-3 pr-4 text-right">Total</th>
                                                <th className="pb-3 pr-4">CAE</th>
                                                <th className="pb-3">Modo</th>
                                                <th className="pb-3"></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {invoices.map((inv, i) => (
                                                <tr key={inv.id || i} className="border-b last:border-0 hover:bg-muted/30">
                                                    <td className="py-3 pr-4 font-mono font-medium">
                                                        {formatInvoiceNumber(inv.puntoVenta, inv.invoiceNumber)}
                                                    </td>
                                                    <td className="py-3 pr-4">
                                                        <Badge variant="outline">{inv.invoiceTypeName}</Badge>
                                                    </td>
                                                    <td className="py-3 pr-4 text-muted-foreground">{arcaDateToDisplay(inv.date)}</td>
                                                    <td className="py-3 pr-4 max-w-[140px] truncate">{inv.clientName}</td>
                                                    <td className="py-3 pr-4 text-right font-medium">${inv.total?.toFixed(2)}</td>
                                                    <td className="py-3 pr-4 font-mono text-xs text-muted-foreground truncate max-w-[130px]">{inv.cae}</td>
                                                    <td className="py-3 pr-4">
                                                        <Badge variant={inv.mode === 'prod' ? 'default' : 'secondary'} className="text-xs">
                                                            {inv.mode === 'prod' ? 'Prod' : 'Homo'}
                                                        </Badge>
                                                    </td>
                                                    <td className="py-3">
                                                        <Button variant="ghost" size="sm" onClick={() => generateInvoicePDF(inv, settings)}>
                                                            <Download className="w-4 h-4" />
                                                        </Button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
