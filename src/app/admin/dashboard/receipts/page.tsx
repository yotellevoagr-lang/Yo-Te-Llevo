
"use client"

import { useState, useMemo, useEffect, useRef } from "react"
import { DndContext, useDraggable, DragEndEvent } from '@dnd-kit/core';
import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { Receipt as ReceiptIcon, Printer, Pencil, Trash2, ZoomIn, ZoomOut, Maximize, Bold, Italic, Loader2, Download } from "lucide-react"
import type { Tour, Reservation, Passenger, GeneralSettings } from "@/lib/types"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { SearchableSelect } from "@/components/searchable-select"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DatePicker } from "@/components/ui/date-picker";
import { cn, generateDisplayID, getDisplayUrl } from "@/lib/utils";
import { getAllFromCollection_client, getDocumentById, saveDocument } from "@/lib/firestore-services";
import { Textarea } from "@/components/ui/textarea";

type FieldType = 'receiptNumber' | 'date' | 'day' | 'month' | 'year' | 'passengerName' | 'passengerDni' | 'passengerPhone' | 'paidAmountText' | 'concept' | 'destination' | 'paxCount' | 'tourDate' | 'totalAmountText' | 'cancellationPolicy' | 'customText' | 'customDate' | 'editableText';

type TemplateField = {
  id: string;
  type: FieldType;
  label: string;
  x: number;
  y: number;
  font: string;
  size: number | '';
  color: string;
  isBold: boolean;
  isItalic: boolean;
  page: number;
  customText?: string;
  customDate?: string;
  width?: number;
};

type ReceiptTemplate = {
  id?: string;
  page1Image: string | null;
  page1ImageDimensions: { width: number; height: number } | null;
  page2Image: string | null;
  page2ImageDimensions: { width: number; height: number } | null;
  fields: TemplateField[];
  zoom?: number;
};

type ReceiptTemplates = {
  template1: ReceiptTemplate;
  template2: ReceiptTemplate;
};

const availableFieldsTemplate1: { type: FieldType, label: string }[] = [
    { type: 'receiptNumber', label: 'N° Recibo' },
    { type: 'date', label: 'Fecha Completa' },
    { type: 'day', label: 'Día' },
    { type: 'month', label: 'Mes (número)' },
    { type: 'year', label: 'Año' },
    { type: 'passengerName', label: 'Nombre Pasajero' },
    { type: 'passengerDni', label: 'DNI Pasajero' },
    { type: 'passengerPhone', label: 'Tel. Pasajero' },
    { type: 'paidAmountText', label: 'Monto Pagado' },
    { type: 'concept', label: 'Concepto' },
    { type: 'destination', label: 'Destino' },
    { type: 'paxCount', label: 'Cant. Pasajeros' },
    { type: 'tourDate', label: 'Fecha Viaje' },
    { type: 'totalAmountText', label: 'Monto Total' },
    { type: 'cancellationPolicy', label: 'Política Cancelación' },
    { type: 'customText', label: 'Texto Fijo' },
    { type: 'customDate', label: 'Fecha Fija' },
    { type: 'editableText', label: 'Texto Editable (por recibo)' },
];

const availableFieldsTemplate2: { type: FieldType, label: string }[] = [
    { type: 'editableText', label: 'Texto Editable (por recibo)' },
];

const fonts = [
    { value: 'Arial, sans-serif', label: 'Arial' },
    { value: 'Verdana, sans-serif', label: 'Verdana' },
    { value: '"Times New Roman", serif', label: 'Times New Roman' },
    { value: 'Georgia, serif', label: 'Georgia' },
    { value: '"Courier New", monospace', label: 'Courier New' },
]

const emptyTemplate: ReceiptTemplate = {
  page1Image: null,
  page1ImageDimensions: null,
  page2Image: null,
  page2ImageDimensions: null,
  fields: [],
  zoom: 1,
};

function DraggableField({ id, children, style, isSelected }: { id: string, children: React.ReactNode, style: React.CSSProperties, isSelected: boolean }) {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id });
    
    const finalStyle: React.CSSProperties = {
        ...style,
        transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
        cursor: isDragging ? 'grabbing' : 'grab',
        zIndex: isDragging ? 1000 : 1,
    };

    return (
        <div 
            ref={setNodeRef} 
            style={finalStyle} 
            {...listeners} 
            {...attributes} 
            className={`absolute p-1 border border-dashed ${isSelected ? 'border-primary bg-primary/10' : 'border-transparent hover:border-gray-400'}`}
        >
            {children}
        </div>
    );
}

export default function ReceiptsPage() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [tours, setTours] = useState<Tour[]>([]);
  const [passengers, setPassengers] = useState<Passenger[]>([]);
  const [generalSettings, setGeneralSettings] = useState<GeneralSettings | null>(null);
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [selectedReservationId, setSelectedReservationId] = useState<string>("");
  const [editableTexts, setEditableTexts] = useState<Record<string, string>>({});
  const contentToPrintRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [activeTemplateTab, setActiveTemplateTab] = useState<'template1' | 'template2'>('template1');
  const [templates, setTemplates] = useState<ReceiptTemplates>({
    template1: { ...emptyTemplate },
    template2: { ...emptyTemplate },
  });
  const [page1ImageFile, setPage1ImageFile] = useState<File | null>(null);
  const [page2ImageFile, setPage2ImageFile] = useState<File | null>(null);
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [activeEditorField, setActiveEditorField] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const canvasRef = useRef<HTMLDivElement>(null);

  const currentTemplate = templates[activeTemplateTab];
  const setCurrentTemplate = (updater: (prev: ReceiptTemplate) => ReceiptTemplate) => {
    setTemplates(prev => ({
      ...prev,
      [activeTemplateTab]: updater(prev[activeTemplateTab])
    }));
  };

  const isManualReceipt = selectedTripId === 'MANUAL_RECEIPT';

  useEffect(() => {
    const fetchData = async () => {
        const [reservationsData, toursData, passengersData, settingsData, templateData] = await Promise.all([
            getAllFromCollection_client<Reservation>('reservations'),
            getAllFromCollection_client<Tour>('tours'),
            getAllFromCollection_client<Passenger>('passengers'),
            getDocumentById<GeneralSettings>('settings', 'general'),
            getDocumentById<ReceiptTemplates>('settings', 'receiptTemplates'),
        ]);

        const processedTours = toursData.map(t => {
            const date = (t.date as any)?.toDate ? (t.date as any).toDate() : new Date(t.date);
            return { ...t, date };
        });

        setReservations(reservationsData);
        setTours(processedTours);
        setPassengers(passengersData);
        setGeneralSettings(settingsData);
        
        if (templateData) {
            setTemplates({
              template1: templateData.template1 || { ...emptyTemplate },
              template2: templateData.template2 || { ...emptyTemplate },
            });
            setZoom(templateData.template1?.zoom || 1);
        } else {
            const oldTemplate = await getDocumentById<ReceiptTemplate>('settings', 'receiptTemplate');
            if (oldTemplate) {
                setTemplates(prev => ({
                    ...prev,
                    template1: { ...oldTemplate, zoom: oldTemplate.zoom || 1 }
                }));
                setZoom(oldTemplate.zoom || 1);
            }
        }
    };
    fetchData();
  }, []);

  const activeTours = useMemo(() => {
    return tours.filter(t => t.date && new Date(t.date) >= new Date());
  }, [tours]);

  const reservationOptions = useMemo(() => {
    if (!selectedTripId || selectedTripId === 'MANUAL_RECEIPT') return [];
    return reservations
        .filter(r => r.tripId === selectedTripId)
        .map(res => {
            const mainPassenger = passengers.find(p => p.id === res.passengerIds[0]);
            const tour = tours.find(t => t.id === res.tripId);
            return {
                value: res.id,
                label: `${res.passenger} (ID: ${generateDisplayID('R', res, tour, mainPassenger)})`,
                keywords: [mainPassenger?.dni || '']
            }
        });
  }, [reservations, selectedTripId, passengers, tours]);

  const selectedReservation = useMemo(() => {
      if (!selectedReservationId) return null;
      return reservations.find(r => r.id === selectedReservationId);
  }, [reservations, selectedReservationId]);

  const activeDisplayTemplate = isManualReceipt ? templates.template2 : templates.template1;

  useEffect(() => {
    const templateToUse = isManualReceipt ? templates.template2 : templates.template1;
    const initialEditableTexts: Record<string, string> = {};
    templateToUse.fields.filter(f => f.type === 'editableText').forEach(field => {
        initialEditableTexts[field.id] = '';
    });
    setEditableTexts(initialEditableTexts);
  }, [selectedReservationId, selectedTripId, templates, isManualReceipt]);

  const handleEditableTextChange = (fieldId: string, value: string) => {
    setEditableTexts(prev => ({ ...prev, [fieldId]: value }));
  }
  
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, page: 0 | 1) => {
    const file = e.target.files?.[0];
    if (file) {
      const tempUrl = URL.createObjectURL(file);
      if (page === 0) {
        setPage1ImageFile(file);
        setCurrentTemplate(prev => ({ ...prev, page1Image: tempUrl }));
      } else {
        setPage2ImageFile(file);
        setCurrentTemplate(prev => ({ ...prev, page2Image: tempUrl }));
      }

      const img = new window.Image();
      img.onload = () => {
        setCurrentTemplate(prev => ({
          ...prev,
          [page === 0 ? 'page1ImageDimensions' : 'page2ImageDimensions']: { width: img.naturalWidth, height: img.naturalHeight },
        }));
      };
      img.src = tempUrl;
    }
  };

  const addField = (type: FieldType) => {
    const availableFields = activeTemplateTab === 'template1' ? availableFieldsTemplate1 : availableFieldsTemplate2;
    const label = availableFields.find(f => f.type === type)?.label || 'Nuevo Campo';
    const newField: TemplateField = {
      id: `field-${Date.now()}`,
      type,
      label,
      x: 20,
      y: 20,
      font: 'Verdana, sans-serif',
      size: 20,
      color: '#000000',
      isBold: false,
      isItalic: false,
      page: 0,
      width: type === 'editableText' ? 200 : undefined,
    };
    if (type === 'customDate') {
        newField.customDate = new Date().toISOString();
    }
    if (type === 'editableText') {
        newField.label = `Texto Editable ${currentTemplate.fields.filter(f => f.type === 'editableText').length + 1}`;
    }
    setCurrentTemplate(prev => ({ ...prev, fields: [...prev.fields, newField] }));
    setActiveEditorField(newField.id);
  };
  
  const updateField = (id: string, updates: Partial<TemplateField>) => {
    setCurrentTemplate(prev => ({
      ...prev,
      fields: prev.fields.map(f => (f.id === id ? { ...f, ...updates } : f))
    }));
  };

  const removeField = (id: string) => {
    setCurrentTemplate(prev => ({ ...prev, fields: prev.fields.filter(f => f.id !== id) }));
    setActiveEditorField(null);
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, delta } = event;
    const field = currentTemplate.fields.find(f => f.id === active.id);
    if (field && delta) {
        const newX = Math.max(0, field.x + delta.x / zoom);
        const newY = Math.max(0, field.y + delta.y / zoom);
        updateField(field.id, { x: newX, y: newY });
    }
  };
  
  const saveTemplate = async () => {
    setIsSavingTemplate(true);
    try {
        const toBase64 = (file: File): Promise<string> =>
            new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.readAsDataURL(file);
                reader.onload = () => resolve(reader.result as string);
                reader.onerror = (error) => reject(error);
            });

        let page1Url = currentTemplate.page1Image;
        if (page1ImageFile) {
            page1Url = await toBase64(page1ImageFile);
        }

        let page2Url = currentTemplate.page2Image;
        if (page2ImageFile) {
            page2Url = await toBase64(page2ImageFile);
        }
        
        const updatedTemplate: ReceiptTemplate = {
            ...currentTemplate,
            zoom: zoom,
            page1Image: page1Url,
            page2Image: page2Url,
        };

        const updatedTemplates = {
            ...templates,
            [activeTemplateTab]: updatedTemplate
        };
        
        await saveDocument('settings', updatedTemplates, 'receiptTemplates');

        setTemplates(updatedTemplates);
        
        toast({ title: "Plantilla Guardada", description: `La ${activeTemplateTab === 'template1' ? 'Plantilla 1' : 'Plantilla 2'} ha sido actualizada.` });
        setIsEditorOpen(false);
    } catch (error) {
        console.error("Error saving template:", error);
        toast({ title: "Error al Guardar", description: "No se pudo guardar la plantilla.", variant: "destructive" });
    } finally {
        setIsSavingTemplate(false);
        setPage1ImageFile(null);
        setPage2ImageFile(null);
    }
  };
  
  const fitToScreen = () => {
      if (!canvasRef.current) return;
      
      const canvasWidth = canvasRef.current.offsetWidth;
      const canvasHeight = canvasRef.current.offsetHeight;

      const page1Dims = currentTemplate.page1ImageDimensions;
      const page2Dims = currentTemplate.page2ImageDimensions;

      let maxWidth = 0;
      let totalHeight = 0;

      if(page1Dims) {
          maxWidth = Math.max(maxWidth, page1Dims.width);
          totalHeight += page1Dims.height;
      }
      if(page2Dims) {
          maxWidth = Math.max(maxWidth, page2Dims.width);
          totalHeight += page2Dims.height + 16;
      }

      if (maxWidth === 0 || totalHeight === 0) return;

      const scaleX = canvasWidth / maxWidth;
      const scaleY = canvasHeight / totalHeight;

      setZoom(Math.min(scaleX, scaleY) * 0.95);
  }

  const activeFieldData = currentTemplate.fields.find(f => f.id === activeEditorField);
  const availableFields = activeTemplateTab === 'template1' ? availableFieldsTemplate1 : availableFieldsTemplate2;

  const generatedReceiptData = useMemo(() => {
    if (isManualReceipt) return null;
    if (!selectedReservation) return null;

    const passenger = passengers.find(p => p.id === selectedReservation.passengerIds[0]);
    const tour = tours.find(t => t.id === selectedReservation.tripId);
    if (!tour || !passenger) return null;

    const globalCancellationPolicy = generalSettings?.cancellationPolicy || `Política de cancelación no definida.`;
    const paidAmount = selectedReservation.installments?.details.filter(inst => inst.isPaid).reduce((sum, inst) => sum + inst.amount, 0) || 0;
    const now = new Date();
    
    return {
      receiptNumber: generateDisplayID('Re', selectedReservation, tour, passenger),
      date: now.toLocaleDateString('es-AR'),
      day: now.getDate().toString(),
      month: (now.getMonth() + 1).toString(),
      year: now.getFullYear().toString(),
      passengerName: passenger?.fullName || 'N/A',
      passengerDni: passenger?.dni || 'N/A',
      passengerPhone: passenger?.phone || 'N/A',
      paidAmountText: `$ ${paidAmount.toLocaleString('es-AR')}`,
      concept: `Viaje a ${tour?.destination || ''} para ${selectedReservation.paxCount} pasajero(s).`,
      destination: tour?.destination || 'N/A',
      paxCount: selectedReservation.paxCount,
      tourDate: tour ? new Date(tour.date).toLocaleDateString('es-AR') : 'N/A',
      totalAmountText: `$ ${selectedReservation.finalPrice.toLocaleString('es-AR')}`,
      cancellationPolicy: tour?.cancellationPolicy || globalCancellationPolicy,
    };
  }, [selectedReservation, passengers, tours, generalSettings, isManualReceipt]);
  
  const generatePdf = async () => {
    if (!contentToPrintRef.current) {
      toast({ title: 'Error', description: 'No se puede encontrar el contenido para generar el PDF.', variant: 'destructive' });
      return null;
    }
    
    try {
      const dataUrl = await toPng(contentToPrintRef.current, {
        quality: 0.98,
        pixelRatio: 2,
      });

      const pdf = new jsPDF({
        orientation: 'p',
        unit: 'px',
        format: 'a4',
      });
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const imgProps = pdf.getImageProperties(dataUrl);
      const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      pdf.addImage(dataUrl, 'PNG', 0, 0, pdfWidth, imgHeight);
      return pdf;
    } catch (error) {
      console.error('Error al generar PDF:', error);
      toast({ title: 'Error', description: 'No se pudo generar el PDF.', variant: 'destructive' });
      return null;
    }
  };


  const handlePrint = async () => {
    const pdf = await generatePdf();
    if (pdf) {
      pdf.autoPrint();
      window.open(pdf.output('bloburl'), '_blank');
    }
  };

  const handleDownloadPdf = async () => {
    const pdf = await generatePdf();
    if (pdf) {
        if (generatedReceiptData) {
            pdf.save(`Recibo_${generatedReceiptData.passengerName.replace(/ /g, '_')}.pdf`);
        } else {
            pdf.save('Recibo_Manual.pdf');
        }
    }
  }

  const canShowReceipt = isManualReceipt || (selectedReservation && generatedReceiptData);

  return (
    <>
    <Dialog open={isEditorOpen} onOpenChange={setIsEditorOpen}>
        <DialogContent className="max-w-[95vw] h-[95vh] flex flex-col" onPointerDownOutside={(e) => e.preventDefault()}>
            <DialogHeader>
                <DialogTitle>Diseñador de Plantillas de Recibo</DialogTitle>
                <DialogDescription>Edita tus plantillas de recibo. La Plantilla 1 usa datos de reservas, la Plantilla 2 es completamente editable.</DialogDescription>
            </DialogHeader>
            
            <Tabs value={activeTemplateTab} onValueChange={(v) => { setActiveTemplateTab(v as 'template1' | 'template2'); setActiveEditorField(null); }} className="flex-1 flex flex-col min-h-0">
                <TabsList className="grid w-full grid-cols-2 mb-4">
                    <TabsTrigger value="template1">Plantilla 1 (Con Reserva)</TabsTrigger>
                    <TabsTrigger value="template2">Plantilla 2 (Manual)</TabsTrigger>
                </TabsList>
                
                <div className="grid grid-cols-12 gap-4 flex-1 min-h-0">
                    <div className="col-span-3 flex flex-col min-h-0">
                        <h3 className="font-semibold text-lg border-b pb-2 mb-4 shrink-0">Controles</h3>
                         <ScrollArea className="flex-1 -mx-2 px-2">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Zoom</Label>
                                    <div className="flex items-center gap-2">
                                        <ZoomOut className="w-4 h-4"/>
                                        <Slider value={[zoom]} onValueChange={(v) => setZoom(v[0])} min={0.2} max={2} step={0.05} />
                                        <ZoomIn className="w-4 h-4"/>
                                    </div>
                                    <Button variant="outline" size="sm" className="w-full" onClick={fitToScreen}>
                                        <Maximize className="w-4 h-4 mr-2"/>
                                        Ajustar a Pantalla
                                    </Button>
                                </div>
                                <div className="space-y-2">
                                    <Label>Añadir Campo</Label>
                                    <Select onValueChange={(v) => addField(v as FieldType)} key={activeTemplateTab}>
                                        <SelectTrigger><SelectValue placeholder="Seleccionar tipo de campo..." /></SelectTrigger>
                                        <SelectContent>
                                            <ScrollArea className="h-72">
                                                {availableFields.map(f => <SelectItem key={f.type} value={f.type}>{f.label}</SelectItem>)}
                                            </ScrollArea>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="page1-upload">Fondo Página 1</Label>
                                    <Input id="page1-upload" type="file" accept="image/*" onChange={e => handleImageUpload(e, 0)} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="page2-upload">Fondo Página 2</Label>
                                    <Input id="page2-upload" type="file" accept="image/*" onChange={e => handleImageUpload(e, 1)} />
                                </div>
                                <hr className="my-4" />
                                {activeFieldData ? (
                                    <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <h4 className="font-semibold">Editando: <span className="text-primary">{activeFieldData.label}</span></h4>
                                        <Button variant="ghost" size="icon" className="text-destructive h-7 w-7" onClick={() => removeField(activeFieldData.id)}><Trash2 className="w-4 h-4"/></Button>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Página</Label>
                                        <Select value={String(activeFieldData.page)} onValueChange={v => updateField(activeFieldData.id, { page: parseInt(v) })}>
                                            <SelectTrigger><SelectValue/></SelectTrigger>
                                            <SelectContent><SelectItem value="0">Página 1</SelectItem><SelectItem value="1">Página 2</SelectItem></SelectContent>
                                        </Select>
                                    </div>
                                    {activeFieldData.type === 'customText' && (
                                        <div className="space-y-2">
                                            <Label>Texto Fijo</Label>
                                            <Input value={activeFieldData.customText || ''} onChange={e => updateField(activeFieldData.id, { customText: e.target.value })} />
                                        </div>
                                    )}
                                    {activeFieldData.type === 'customDate' && (
                                        <div className="space-y-2">
                                            <Label>Fecha Fija</Label>
                                            <DatePicker 
                                                date={activeFieldData.customDate ? new Date(activeFieldData.customDate) : undefined}
                                                setDate={(d) => updateField(activeFieldData.id, { customDate: d?.toISOString() })}
                                                className="w-full"
                                            />
                                        </div>
                                    )}
                                    {activeFieldData.type === 'editableText' && (
                                        <div className="space-y-2">
                                            <Label>Ancho del campo (px)</Label>
                                            <Input 
                                                type="number" 
                                                value={activeFieldData.width || 200} 
                                                onChange={e => updateField(activeFieldData.id, { width: parseInt(e.target.value) || 200 })}
                                                min={50}
                                                max={1000}
                                            />
                                        </div>
                                    )}
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="space-y-2"><Label>Fuente</Label><Select value={activeFieldData.font} onValueChange={v => updateField(activeFieldData.id, { font: v })}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{fonts.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}</SelectContent></Select></div>
                                        <div className="space-y-2"><Label>Tamaño (px)</Label><Input type="number" value={activeFieldData.size} onChange={e => updateField(activeFieldData.id, { size: e.target.value === '' ? '' : parseInt(e.target.value) })}/></div>
                                    </div>
                                     <div className="grid grid-cols-2 gap-2">
                                        <Button variant={activeFieldData.isBold ? "secondary" : "outline"} onClick={() => updateField(activeFieldData.id, { isBold: !activeFieldData.isBold })}><Bold className="w-4 h-4"/></Button>
                                        <Button variant={activeFieldData.isItalic ? "secondary" : "outline"} onClick={() => updateField(activeFieldData.id, { isItalic: !activeFieldData.isItalic })}><Italic className="w-4 h-4"/></Button>
                                    </div>
                                    <div className="space-y-2"><Label>Color</Label><Input type="color" value={activeFieldData.color} onChange={e => updateField(activeFieldData.id, { color: e.target.value })} className="h-10 p-1"/></div>
                                    </div>
                                ) : <p className="text-muted-foreground text-sm">Selecciona un campo para editarlo.</p>}
                            </div>
                        </ScrollArea>
                        <DialogFooter className="pt-4 border-t shrink-0">
                            <Button variant="outline" onClick={() => setIsEditorOpen(false)}>Cancelar</Button>
                            <Button onClick={saveTemplate} disabled={isSavingTemplate}>
                                {isSavingTemplate && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                                {isSavingTemplate ? "Guardando..." : "Guardar Plantilla"}
                            </Button>
                        </DialogFooter>
                    </div>

                     <div ref={canvasRef} className="col-span-9 overflow-auto bg-gray-200 rounded-md flex justify-center items-start p-8">
                       <DndContext onDragEnd={handleDragEnd}>
                        <div style={{ transform: `scale(${zoom})`, transformOrigin: 'top center' }} >
                          <div className="flex flex-col items-center gap-4">
                              {[0, 1].map(pageIndex => {
                                const imageKey = pageIndex === 0 ? 'page1Image' : 'page2Image';
                                const imageUrl = currentTemplate[imageKey];
                                const pageDimensions = pageIndex === 0 ? currentTemplate.page1ImageDimensions : currentTemplate.page2ImageDimensions;
                                
                                const pageStyle = pageDimensions
                                    ? { width: `${pageDimensions.width}px`, height: `${pageDimensions.height}px` }
                                    : {};
                                
                                const hasContentForPage = imageUrl || currentTemplate.fields.some(f => f.page === pageIndex);
                                if (!hasContentForPage) return null;

                                 return (
                                 <div key={pageIndex} style={pageStyle} className="relative bg-white shadow-lg shrink-0">
                                      { imageUrl && <img src={getDisplayUrl(imageUrl)} alt={`Fondo Página ${pageIndex + 1}`} className="absolute inset-0 w-full h-full object-cover" /> }
                                      
                                      {currentTemplate.fields.filter(f => f.page === pageIndex).map(field => (
                                           <DraggableField key={field.id} id={field.id} style={{ top: field.y, left: field.x }} isSelected={activeEditorField === field.id}>
                                              <div 
                                                onClick={() => setActiveEditorField(field.id)} 
                                                style={{ 
                                                    fontSize: `${field.size || 12}px`, 
                                                    color: field.color, 
                                                    fontFamily: field.font, 
                                                    fontWeight: field.isBold ? 'bold' : 'normal', 
                                                    fontStyle: field.isItalic ? 'italic' : 'normal', 
                                                    whiteSpace: field.type === 'editableText' ? 'normal' : 'nowrap',
                                                    width: field.type === 'editableText' ? `${field.width || 200}px` : 'auto',
                                                    minHeight: field.type === 'editableText' ? '1.5em' : 'auto',
                                                }}
                                              >
                                                {field.type === 'customText' 
                                                    ? (field.customText || `[${field.label}]`)
                                                    : field.type === 'customDate'
                                                        ? (field.customDate ? new Date(field.customDate).toLocaleDateString('es-AR') : `[${field.label}]`)
                                                        : field.type === 'editableText'
                                                            ? `[Escribir aquí...]`
                                                            : `[${field.label}]`}
                                              </div>
                                           </DraggableField>
                                      ))}
                                 </div>
                              )})}
                          </div>
                        </div>
                       </DndContext>
                    </div>
                </div>
            </Tabs>
        </DialogContent>
    </Dialog>


    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
            <h2 className="text-2xl font-bold">Generación de Recibos</h2>
            <p className="text-muted-foreground">Selecciona una reserva para generar un recibo basado en tu plantilla, o usa "Recibo Manual" para uno completamente editable.</p>
        </div>
        <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsEditorOpen(true)}><Pencil className="mr-2 h-4 w-4"/> Diseñar Plantillas</Button>
            {canShowReceipt && (
              <>
                <Button onClick={handleDownloadPdf}><Download className="mr-2 h-4 w-4"/> Descargar PDF</Button>
                <Button onClick={handlePrint}><Printer className="mr-2 h-4 w-4"/> Imprimir Recibo</Button>
              </>
            )}
        </div>
      </div>

       <Card>
        <CardHeader>
            <CardTitle>Selección de Reserva</CardTitle>
            <CardDescription>Elige el viaje y luego busca la reserva por nombre o DNI del pasajero. Para un recibo manual, selecciona "Recibo Manual".</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row items-start gap-4">
            <div className="space-y-2 w-full sm:w-1/2">
                <Label htmlFor="trip-filter">1. Selecciona un Viaje</Label>
                <Select onValueChange={(val) => { setSelectedTripId(val); setSelectedReservationId(""); }} value={selectedTripId || ''}>
                    <SelectTrigger id="trip-filter"><SelectValue placeholder="Seleccionar viaje..." /></SelectTrigger>
                    <SelectContent>
                        <ScrollArea className="h-72">
                           <SelectItem value="MANUAL_RECEIPT" className="font-semibold text-primary border-b mb-2">
                               📝 Recibo Manual (Plantilla 2)
                           </SelectItem>
                           {activeTours.map(tour => <SelectItem key={tour.id} value={tour.id}>{tour.destination}</SelectItem>)}
                        </ScrollArea>
                    </SelectContent>
                </Select>
            </div>
             <div className="space-y-2 w-full sm:w-1/2">
                <Label htmlFor="reservation-filter">2. Selecciona una Reserva</Label>
                 <SearchableSelect 
                    options={reservationOptions} 
                    value={selectedReservationId} 
                    onChange={setSelectedReservationId} 
                    placeholder={isManualReceipt ? "No aplica para recibo manual" : "Buscar reserva..."} 
                    disabled={!selectedTripId || isManualReceipt}
                 />
            </div>
        </CardContent>
       </Card>

        {canShowReceipt ? (
             <div className="w-full overflow-x-auto py-4">
                <div className="flex justify-center">
                    <div
                        style={{
                            transform: `scale(${activeDisplayTemplate.zoom || 1})`,
                            transformOrigin: 'top center',
                        }}
                    >
                      <div ref={contentToPrintRef} className="flex flex-col items-center gap-4">
                        {[0, 1].map(pageIndex => {
                            const imageKey = pageIndex === 0 ? 'page1Image' : 'page2Image';
                            const imageUrl = activeDisplayTemplate[imageKey];
                            const pageDimensions = pageIndex === 0 ? activeDisplayTemplate.page1ImageDimensions : activeDisplayTemplate.page2ImageDimensions;
                            
                            const pageStyle = pageDimensions
                                ? { width: `${pageDimensions.width}px`, height: `${pageDimensions.height}px` }
                                : {}; 

                            const hasContentForPage = (imageUrl || activeDisplayTemplate.fields.some(f => f.page === pageIndex));
                            
                            if (!hasContentForPage) return null;
                            
                            return (
                                <div key={pageIndex} style={pageStyle} className="relative bg-white shadow-lg shrink-0">
                                    { imageUrl && <img src={getDisplayUrl(imageUrl)} alt={`Fondo Página ${pageIndex + 1}`} className="absolute inset-0 w-full h-full object-cover" /> }
                                    
                                    {activeDisplayTemplate.fields.filter(f => f.page === pageIndex).map(field => {
                                        const fieldStyle: React.CSSProperties = {
                                            top: field.y,
                                            left: field.x,
                                            fontSize: `${field.size || 12}px`,
                                            color: field.color,
                                            fontFamily: field.font,
                                            fontWeight: field.isBold ? 'bold' : 'normal',
                                            fontStyle: field.isItalic ? 'italic' : 'normal',
                                        };

                                        if (field.type === 'editableText') {
                                            return (
                                                <Textarea
                                                    key={field.id}
                                                    value={editableTexts[field.id] || ''}
                                                    onChange={(e) => handleEditableTextChange(field.id, e.target.value)}
                                                    placeholder="Escribe aquí..."
                                                    style={{ 
                                                        ...fieldStyle, 
                                                        width: `${field.width || 200}px`,
                                                        background: 'transparent', 
                                                        border: '1px dashed rgba(0,0,0,0.3)', 
                                                        outline: 'none', 
                                                        overflow: 'hidden',
                                                        resize: 'none',
                                                        minHeight: '2em',
                                                    }}
                                                    className="absolute p-1 m-0"
                                                />
                                            );
                                        } else {
                                            let textContent: string | number | undefined = '';
                                            if (field.type === 'customText') {
                                                textContent = field.customText;
                                            } else if (field.type === 'customDate') {
                                                textContent = field.customDate ? new Date(field.customDate).toLocaleDateString('es-AR') : '';
                                            } else if (generatedReceiptData) {
                                                textContent = generatedReceiptData[field.type as keyof typeof generatedReceiptData];
                                            }
                                            return (
                                                <div key={field.id} style={{...fieldStyle, whiteSpace: 'nowrap'}} className="absolute">
                                                    {textContent}
                                                </div>
                                            );
                                        }
                                    })}
                            </div>
                            )
                        })}
                    </div>
                    </div>
                </div>
            </div>
        ) : (
            <Card>
                <CardContent className="p-12 text-center flex flex-col items-center gap-4">
                    <ReceiptIcon className="w-16 h-16 text-muted-foreground/50"/>
                    <p className="text-muted-foreground">Selecciona un viaje y una reserva para ver el recibo, o selecciona "Recibo Manual" para usar la Plantilla 2. Si no has creado plantillas, ve a "Diseñar Plantillas".</p>
                </CardContent>
            </Card>
        )}
    </div>
    </>
  )
}
