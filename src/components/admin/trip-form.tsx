

"use client"

import { useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { DatePicker } from "@/components/ui/date-picker"
import { useToast } from "@/hooks/use-toast"
import type { Tour, LayoutItemType, LayoutCategory, Insurance, Pension, PricingTier, TourCosts, ExtraCost, TransportUnit, BoardingPoint, CustomLayoutConfig } from "@/lib/types"
import { PlusCircle, Trash2, Upload } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import Image from "next/image"
import { Checkbox } from "../ui/checkbox"
import { getDocumentById } from "@/lib/firestore-services"

interface TripFormProps {
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
  onSave: (tour: Tour) => void
  tour: Tour | null
  boardingPoints: BoardingPoint[];
}

type LayoutEntry = {
    id: number;
    type: LayoutItemType | '';
    count: number | '';
    coordinator: string;
    coordinatorPhone: string;
}

const defaultCosts: TourCosts = { transport: [], hotel: 0, extras: [] };

const defaultTourData: Omit<Tour, 'id' | 'destination' | 'date' | 'price' | 'flyerUrl' | 'transportUnits'> = {
    origin: "",
    nights: 0,
    departurePoint: "",
    platform: "",
    presentationTime: "",
    departureTime: "",
    bus: "",
    pricingTiers: [],
    costs: defaultCosts,
    vehicles: {},
    airplanes: {},
    cruises: {},
    isFeatured: false,
    currency: 'ARS',
}


export function TripForm({ isOpen, onOpenChange, onSave, tour, boardingPoints }: TripFormProps) {
  const [formData, setFormData] = useState<Omit<Tour, 'id' | 'flyerUrl'>>({
      destination: "", date: new Date(), price: 0, ...defaultTourData
  });
  const [transportUnits, setTransportUnits] = useState<TransportUnit[]>([]);
  const [isLoading, setIsLoading] = useState(false)
  const [nextId, setNextId] = useState(1);
  const [layoutConfig, setLayoutConfig] = useState<Record<LayoutCategory, Record<string, CustomLayoutConfig>>>({ vehicles: {}, airplanes: {}, cruises: {} });
  const [bgImagePreview, setBgImagePreview] = useState<string | null>(null);
  const { toast } = useToast();

  const categoryNames: Record<LayoutCategory, string> = {
      vehicles: 'Vehículos',
      airplanes: 'Aviones',
      cruises: 'Cruceros'
  }

  useEffect(() => {
    const fetchLayoutConfig = async () => {
        const config = await getDocumentById<any>('settings', 'layouts');
        if (config) {
            setLayoutConfig(config);
        }
    }
    fetchLayoutConfig();
  }, []);

  useEffect(() => {
    if (isOpen) {
        if (tour) {
            setFormData({
              destination: tour.destination,
              date: tour.date ? new Date(tour.date) : new Date(),
              price: tour.price || 0,
              currency: tour.currency || 'ARS',
              isFeatured: tour.isFeatured || false,
              origin: tour.origin || "",
              nights: tour.nights || 0,
              departurePoint: tour.departurePoint || "",
              platform: tour.platform || "",
              presentationTime: tour.presentationTime || "",
              departureTime: tour.departureTime || "",
              bus: tour.bus || "",
              pricingTiers: tour.pricingTiers || [],
              costs: {
                hotel: tour.costs?.hotel || 0,
                transport: tour.costs?.transport || [],
                extras: tour.costs?.extras || []
              },
              vehicles: tour.vehicles || {},
              airplanes: tour.airplanes || {},
              cruises: tour.cruises || {},
              backgroundImage: tour.backgroundImage,
              observations: tour.observations,
              cancellationPolicy: tour.cancellationPolicy,
            });
            setTransportUnits(tour.transportUnits || []);
            setNextId((tour.transportUnits?.length || 0) + 1);
            setBgImagePreview(tour.backgroundImage || null);

        } else {
            // Reset form for new trip
            setFormData({destination: "", date: new Date(), price: 0, ...defaultTourData});
            setTransportUnits([]);
            setNextId(1);
            setBgImagePreview(null);
        }
        setIsLoading(false); 
    }
  }, [tour, isOpen])
  
  const handleFormChange = (field: keyof typeof formData, value: any) => {
    setFormData(prev => ({...prev, [field]: value}));
  }

  const handleAddUnit = () => {
      setTransportUnits(prev => [...prev, {id: nextId, category: 'vehicles', type: '', count: 1}]);
      setNextId(prev => prev + 1);
  }

  const handleRemoveUnit = (id: number) => {
    setTransportUnits(prev => prev.filter(unit => unit.id !== id));
  }
  
  const handleUnitChange = (id: number, field: keyof TransportUnit, value: any) => {
      setTransportUnits(prev => prev.map(unit => {
          if (unit.id === id) {
             const updatedUnit = { ...unit, [field]: value };
             // Reset type if category changes
             if (field === 'category') {
                 updatedUnit.type = '';
             }
             return updatedUnit;
          }
          return unit;
      }))
  }
  
  const handleCostChange = (index: number, value: string) => {
      const newCosts = [...(formData.costs?.transport || [])];
      newCosts[index] = { ...newCosts[index], amount: value === '' ? 0 : parseFloat(value) || 0 };
      setFormData(prev => ({ ...prev, costs: { ...prev.costs!, transport: newCosts } }));
  }

  useEffect(() => {
    // Sync transportUnits with costs
    const transportCosts = transportUnits.map(unit => {
        const existing = formData.costs?.transport?.find(c => c.unitId === unit.id);
        return {
            unitId: unit.id,
            category: unit.category,
            amount: existing?.amount || 0
        };
    });
    setFormData(prev => ({ ...prev, costs: { ...prev.costs!, transport: transportCosts } }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transportUnits]);

  const handleAddTier = () => {
      setFormData(prev => ({...prev, pricingTiers: [...(prev.pricingTiers || []), { id: `T-${Math.random().toString(36).substring(2, 9)}`, name: '', price: 0 }]}))
  }

  const handleTierChange = (id: string, field: 'name' | 'price', value: string | number) => {
      const processedValue = field === 'price' && value === '' ? '' : value;
      setFormData(prev => ({...prev, pricingTiers: (prev.pricingTiers || []).map(tier => 
          tier.id === id ? { ...tier, [field]: processedValue } : tier
      )}));
  }

  const handleRemoveTier = (id: string) => {
    setFormData(prev => ({...prev, pricingTiers: (prev.pricingTiers || []).filter(tier => tier.id !== id)}));
  }
  
  const handleHotelCostChange = (value: string) => {
      const processedValue = value === '' ? '' : parseFloat(value);
      setFormData(prev => ({...prev, costs: {...prev.costs!, hotel: processedValue }}));
  }


  const handleAddExtraCost = () => {
    setFormData(prev => ({...prev, costs: {...prev.costs, extras: [...(prev.costs?.extras || []), {id: `E-${Math.random().toString(36).substring(2, 9)}`, description: '', amount: 0}]}}));
  }

  const handleExtraCostChange = (id: string, field: 'description' | 'amount', value: string | number) => {
    const processedValue = field === 'amount' && value === '' ? '' : value;
    setFormData(prev => ({ ...prev, costs: {...prev.costs, extras: (prev.costs?.extras || []).map(c => c.id === id ? {...c, [field]: processedValue} : c)}}));
  }

  const handleRemoveExtraCost = (id: string) => {
    setFormData(prev => ({ ...prev, costs: {...prev.costs, extras: (prev.costs?.extras || []).filter(c => c.id !== id)}}));
  }
  
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        setBgImagePreview(dataUrl);
        handleFormChange('backgroundImage', dataUrl);
      };
      reader.readAsDataURL(file);
    }
  };


  const handleSubmit = () => {
    const { destination, date, price } = formData;
    if (!destination || !date || price === null || Number(price) <= 0) {
      toast({ title: "Faltan datos", description: "Por favor, completa destino, fecha y un precio válido.", variant: "destructive" });
      return;
    }

    if (transportUnits.length === 0 || transportUnits.some(u => !u.type)) {
        toast({ title: "Transporte incompleto", description: "Debes agregar al menos una unidad de transporte y seleccionar su tipo.", variant: "destructive" });
        return;
    }

    const tourDataToSave: Partial<Tour> = {
        ...formData,
        price: Number(formData.price) || 0,
        costs: {
            ...formData.costs,
            hotel: Number(formData.costs?.hotel) || 0,
            transport: (formData.costs?.transport || []).map(c => ({...c, amount: Number(c.amount) || 0})),
            extras: (formData.costs?.extras || []).map(c => ({...c, amount: Number(c.amount) || 0})),
        },
        pricingTiers: (formData.pricingTiers || []).map(t => ({...t, price: Number(t.price) || 0})).filter(t => t.name),
        transportUnits,
    };
    
    // Clear old data structures
    delete tourDataToSave.flyerUrl;
    delete tourDataToSave.flyerType;
    delete tourDataToSave.vehicles;
    delete tourDataToSave.airplanes;
    delete tourDataToSave.cruises;

    if(tour?.id) {
        tourDataToSave.id = tour.id;
    }

    setIsLoading(true);
    onSave(tourDataToSave as Tour);
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl flex flex-col max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>{tour ? "Editar Viaje" : "Crear Nuevo Viaje"}</DialogTitle>
          <DialogDescription>
            {tour ? "Modifica los detalles del viaje." : "Completa los detalles para crear un nuevo viaje."}
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto pr-6">
            <div className="py-4 space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="destination">Destino</Label>
                    <Input id="destination" value={formData.destination} onChange={(e) => handleFormChange('destination', e.target.value)} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="date">Fecha</Label>
                    <DatePicker 
                      id="date" 
                      date={formData.date} 
                      setDate={(d) => handleFormChange('date', d)} 
                      className="h-10 w-full"
                      captionLayout="dropdown-buttons"
                      fromYear={new Date().getFullYear()}
                      toYear={new Date().getFullYear() + 10}
                    />
                </div>
                 <div className="space-y-2">
                    <Label>Precio Base (Adulto)</Label>
                    <div className="flex gap-2">
                        <Input id="price" type="number" value={formData.price} onChange={(e) => handleFormChange('price', e.target.value)} placeholder="0"/>
                        <Select value={formData.currency} onValueChange={(value) => handleFormChange('currency', value)}>
                            <SelectTrigger className="w-[100px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ARS">ARS</SelectItem>
                                <SelectItem value="USD">USD</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <div className="flex items-center space-x-2 pt-2">
                    <Checkbox id="isFeatured" checked={formData.isFeatured} onCheckedChange={(checked) => handleFormChange('isFeatured', !!checked)} />
                    <Label htmlFor="isFeatured" className="font-normal">Marcar como Viaje Destacado en la página de inicio</Label>
                </div>

                <div className="space-y-4 pt-2">
                    <Accordion type="multiple" className="w-full" defaultValue={['general', 'transport', 'costs']}>
                        <AccordionItem value="images">
                            <AccordionTrigger className="text-base font-medium">Imágenes</AccordionTrigger>
                            <AccordionContent className="pt-4 space-y-4">
                               <div className="space-y-2">
                                  <Label htmlFor="bg-image">Imagen de Fondo para Página de Reserva</Label>
                                  <Input id="bg-image" type="file" accept="image/*" onChange={handleImageChange} />
                               </div>
                               {bgImagePreview && (
                                  <div className="relative h-32 w-full rounded-md overflow-hidden border">
                                    <Image src={bgImagePreview} alt="Vista previa" layout="fill" objectFit="cover"/>
                                  </div>
                               )}
                            </AccordionContent>
                         </AccordionItem>
                         <AccordionItem value="general">
                            <AccordionTrigger className="text-base font-medium">Información para Tickets</AccordionTrigger>
                            <AccordionContent className="pt-4 space-y-4">
                               <div className="grid grid-cols-2 gap-4">
                                  <div className="space-y-2"><Label>Origen</Label><Input value={formData.origin} onChange={(e) => handleFormChange('origin', e.target.value)} /></div>
                                  <div className="space-y-2"><Label>Noches</Label><Input type="number" value={formData.nights === 0 ? '' : formData.nights} onChange={(e) => handleFormChange('nights', e.target.value === '' ? '' : parseInt(e.target.value) || 0)} /></div>
                                  <div className="space-y-2"><Label>Empresa de Transporte</Label><Input value={formData.bus} onChange={(e) => handleFormChange('bus', e.target.value)} /></div>
                                  <div className="space-y-2">
                                      <Label>Punto de Embarque</Label>
                                      <Select value={formData.departurePoint} onValueChange={(val) => handleFormChange('departurePoint', val)}>
                                          <SelectTrigger><SelectValue placeholder="Seleccionar..."/></SelectTrigger>
                                          <SelectContent>
                                            {boardingPoints.map(bp => <SelectItem key={bp.id} value={bp.name}>{bp.name}</SelectItem>)}
                                          </SelectContent>
                                      </Select>
                                  </div>
                                  <div className="space-y-2"><Label>Plataforma</Label><Input value={formData.platform} onChange={(e) => handleFormChange('platform', e.target.value)} /></div>
                                  <div className="space-y-2"><Label>Hora Presentación</Label><Input value={formData.presentationTime} onChange={(e) => handleFormChange('presentationTime', e.target.value)} placeholder="HH:MM"/></div>
                                  <div className="space-y-2"><Label>Hora Salida</Label><Input value={formData.departureTime} onChange={(e) => handleFormChange('departureTime', e.target.value)} placeholder="HH:MM"/></div>
                               </div>
                            </AccordionContent>
                         </AccordionItem>
                        
                         <AccordionItem value="transport">
                            <AccordionTrigger className="text-base font-medium">Configuración de Transporte</AccordionTrigger>
                            <AccordionContent className="pt-4 space-y-3">
                                {transportUnits.map((unit) => (
                                <div key={unit.id} className="p-4 border rounded-lg space-y-3">
                                    <div className="flex items-center gap-2">
                                        <Select value={unit.category} onValueChange={(value: LayoutCategory) => handleUnitChange(unit.id, 'category', value)}>
                                            <SelectTrigger><SelectValue placeholder="Categoría..." /></SelectTrigger>
                                            <SelectContent>
                                                {(Object.keys(layoutConfig) as LayoutCategory[]).map(cat => <SelectItem key={cat} value={cat}>{categoryNames[cat]}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                        <Select value={unit.type} onValueChange={(value) => handleUnitChange(unit.id, 'type', value)}>
                                            <SelectTrigger><SelectValue placeholder="Tipo..." /></SelectTrigger>
                                            <SelectContent>
                                                {Object.entries(layoutConfig[unit.category] || {}).map(([key, config]) => (
                                                    <SelectItem key={key} value={key}>{config.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => handleRemoveUnit(unit.id)}>
                                            <Trash2 className="w-4 h-4"/>
                                        </Button>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <Input placeholder="Coordinador/a" value={unit.coordinator || ''} onChange={(e) => handleUnitChange(unit.id, 'coordinator', e.target.value)} />
                                        <Input placeholder="Tel. Coordinador/a" value={unit.coordinatorPhone || ''} onChange={(e) => handleUnitChange(unit.id, 'coordinatorPhone', e.target.value)} />
                                    </div>
                                </div>
                                ))}
                                <Button variant="outline" size="sm" className="mt-2" onClick={handleAddUnit}>
                                <PlusCircle className="mr-2 h-4 w-4"/> Añadir Unidad
                                </Button>
                            </AccordionContent>
                        </AccordionItem>
                        
                         <AccordionItem value="costs">
                            <AccordionTrigger className="text-base font-medium">Costos del Viaje</AccordionTrigger>
                            <AccordionContent className="pt-4 space-y-4">
                               <div className="space-y-2">
                                  <Label>Costo Hotel</Label>
                                   <Input type="number" value={formData.costs?.hotel || ''} onChange={(e) => handleHotelCostChange(e.target.value)} placeholder="0"/>
                               </div>
                               <div className="space-y-2">
                                    <Label>Costos de Transporte</Label>
                                    {(formData.costs?.transport || []).map((cost, index) => {
                                        const unit = transportUnits.find(u => u.id === cost.unitId);
                                        if (!unit) return null;
                                        const unitName = layoutConfig[unit.category]?.[unit.type]?.name || `Unidad ${unit.id}`;
                                        return (
                                            <div key={cost.unitId} className="flex items-center gap-2">
                                                <Label className="flex-1">Costo para: {unitName}</Label>
                                                <Input type="number" value={cost.amount || ''} onChange={e => handleCostChange(index, e.target.value)} className="w-40"/>
                                            </div>
                                        )
                                    })}
                               </div>
                               <div className="space-y-4 p-4 border rounded-lg">
                                  <Label className="text-lg font-medium">Gastos Extras</Label>
                                  <div className="space-y-3">
                                    {(formData.costs?.extras || []).map(cost => (
                                       <div key={cost.id} className="flex items-center gap-2">
                                        <Input 
                                          placeholder="Descripción del gasto" 
                                          value={cost.description}
                                          onChange={e => handleExtraCostChange(cost.id, 'description', e.target.value)}
                                        />
                                        <Input 
                                          type="number" 
                                          placeholder="Monto" 
                                          value={cost.amount || ''}
                                          onChange={e => handleExtraCostChange(cost.id, 'amount', e.target.value)}
                                          className="w-40"
                                        />
                                        <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => handleRemoveExtraCost(cost.id)}>
                                          <Trash2 className="w-4 h-4"/>
                                        </Button>
                                      </div>
                                    ))}
                                  </div>
                                   <Button variant="outline" size="sm" className="mt-2" onClick={handleAddExtraCost}>
                                    <PlusCircle className="mr-2 h-4 w-4"/> Añadir Gasto
                                  </Button>
                               </div>
                            </AccordionContent>
                        </AccordionItem>

                        <AccordionItem value="pricing">
                            <AccordionTrigger className="text-base font-medium">Tarifas Diferenciales</AccordionTrigger>
                            <AccordionContent className="pt-4">
                                <div className="space-y-4 p-4 border rounded-lg">
                                  <Label className="text-lg font-medium">Tarifas por Pasajero</Label>
                                  <div className="space-y-3">
                                    {(formData.pricingTiers || []).map(tier => (
                                      <div key={tier.id} className="flex items-center gap-2">
                                        <Input 
                                          placeholder="Nombre (Ej: Niño)" 
                                          value={tier.name}
                                          onChange={e => handleTierChange(tier.id, 'name', e.target.value)}
                                        />
                                        <Input 
                                          type="number" 
                                          placeholder="Precio" 
                                          value={tier.price || ''}
                                          onChange={e => handleTierChange(tier.id, 'price', e.target.value)}
                                          className="w-40"
                                        />
                                        <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => handleRemoveTier(tier.id)}>
                                          <Trash2 className="w-4 h-4"/>
                                        </Button>
                                      </div>
                                    ))}
                                  </div>
                                  <Button variant="outline" size="sm" className="mt-2" onClick={handleAddTier}>
                                    <PlusCircle className="mr-2 h-4 w-4"/> Añadir Tarifa
                                  </Button>
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                </div>
            </div>
        </div>

        <DialogFooter className="mt-auto pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? "Guardando..." : "Guardar Cambios"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
