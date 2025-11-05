"use client"

import { useEffect, useState, useMemo } from "react"
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
import type { Tour, LayoutItemType, LayoutCategory, Insurance, Pension, PricingTier, TourCosts, ExtraCost, TransportUnit, BoardingPoint, CustomLayoutConfig, GalleryItem, GeneralSettings } from "@/lib/types"
import { PlusCircle, Trash2, Upload, Star, Video, Image as ImageIcon, Loader2 } from "lucide-react"
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
import { Checkbox } from "../ui/checkbox"
import { getDocumentById } from "@/lib/firestore-services"
import { cn } from "@/lib/utils"
import Image from "next/image"
import { getDisplayUrl } from "@/lib/utils"

interface TripFormProps {
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
  onSave: (tour: Tour) => void
  tour: Tour | null
  boardingPoints: BoardingPoint[];
}

const defaultCosts: TourCosts = { transport: [], hotel: { amount: 0, currency: 'ARS' }, extras: [] };

const defaultTourData: Omit<Tour, 'id' | 'destination' | 'date' | 'price' | 'transportUnits'> = {
    origin: "",
    days: 0,
    nights: 0,
    departurePoint: "",
    platform: "",
    presentationTime: "",
    departureTime: "",
    bus: "",
    pricingTiers: [],
    costs: defaultCosts,
    isFeatured: false,
    currency: 'ARS',
    tags: [],
    description: "",
    gallery: [],
}

type GalleryFile = {
  file: File;
  previewUrl: string;
  type: 'image' | 'video';
  id: string;
};

const fileToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
        reader.readAsDataURL(file);
    });
};

export function TripForm({ isOpen, onOpenChange, onSave, tour, boardingPoints }: TripFormProps) {
  const [formData, setFormData] = useState<Omit<Tour, 'id'>>({
      destination: "", date: new Date(), price: 0, ...defaultTourData
  });
  const [transportUnits, setTransportUnits] = useState<TransportUnit[]>([]);
  const [isLoading, setIsLoading] = useState(false)
  const [nextId, setNextId] = useState(1);
  const [layoutConfig, setLayoutConfig] = useState<Record<LayoutCategory, Record<string, CustomLayoutConfig>>>({ vehicles: {}, airplanes: {}, cruises: {} });
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  
  const [newGalleryFiles, setNewGalleryFiles] = useState<GalleryFile[]>([]);
  const [backgroundImageFile, setBackgroundImageFile] = useState<File | null>(null);
  const [backgroundImagePreview, setBackgroundImagePreview] = useState<string | null>(null);

  const { toast } = useToast();

  const categoryNames: Record<LayoutCategory, string> = {
      vehicles: 'Vehículos',
      airplanes: 'Aviones',
      cruises: 'Cruceros'
  }

  useEffect(() => {
    const fetchAuxiliaryData = async () => {
        const [configData, settingsData] = await Promise.all([
             getDocumentById<any>('settings', 'layouts'),
             getDocumentById<GeneralSettings>('settings', 'general')
        ]);
        if (configData) setLayoutConfig(configData);
        if (settingsData) setAvailableTags(settingsData.availableTags || []);
    }
    fetchAuxiliaryData();
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
              tags: tour.tags || [],
              origin: tour.origin || "",
              days: tour.days || 0,
              nights: tour.nights || 0,
              departurePoint: tour.departurePoint || "",
              platform: tour.platform || "",
              presentationTime: tour.presentationTime || "",
              departureTime: tour.departureTime || "",
              bus: tour.bus || "",
              pricingTiers: tour.pricingTiers || [],
              costs: {
                hotel: tour.costs?.hotel || { amount: 0, currency: 'ARS' },
                transport: tour.costs?.transport || [],
                extras: tour.costs?.extras || []
              },
              backgroundImage: tour.backgroundImage,
              gallery: tour.gallery || [],
              description: tour.description || "",
              observations: tour.observations,
              cancellationPolicy: tour.cancellationPolicy,
            });
            setBackgroundImagePreview(tour.backgroundImage || null);
            setTransportUnits(tour.transportUnits || []);
            setNextId((tour.transportUnits?.length || 0) + 1);

        } else {
            setFormData({destination: "", date: new Date(), price: 0, ...defaultTourData});
            setTransportUnits([]);
            setBackgroundImagePreview(null);
            setNextId(1);
        }
        setNewGalleryFiles([]);
        setBackgroundImageFile(null);
        setIsLoading(false); 
    }
  }, [tour, isOpen])
  
  const handleFormChange = (field: keyof typeof formData, value: any) => {
    setFormData(prev => ({...prev, [field]: value}));
  }

  const handleToggleTag = (tag: string) => {
    const currentTags = formData.tags || [];
    if (currentTags.includes(tag)) {
        handleFormChange('tags', currentTags.filter(t => t !== tag));
    } else {
        handleFormChange('tags', [...currentTags, tag]);
    }
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
             if (field === 'category') {
                 updatedUnit.type = '';
             }
             return updatedUnit;
          }
          return unit;
      }))
  }
  
  const handleCostChange = (index: number, field: 'amount' | 'currency', value: any) => {
      const newCosts = [...(formData.costs?.transport || [])];
      const valToSet = field === 'amount' ? (value === '' ? 0 : parseFloat(value) || 0) : value;
      newCosts[index] = { ...newCosts[index], [field]: valToSet };
      setFormData(prev => ({ ...prev, costs: { ...prev.costs!, transport: newCosts } }));
  }

  useEffect(() => {
    const transportCosts = transportUnits.map(unit => {
        const existing = formData.costs?.transport?.find(c => c.unitId === unit.id);
        return {
            unitId: unit.id,
            category: unit.category,
            amount: existing?.amount || 0,
            currency: existing?.currency || formData.currency || 'ARS'
        };
    });
    setFormData(prev => ({ ...prev, costs: { ...prev.costs!, transport: transportCosts } }));
  }, [transportUnits, formData.currency]);

  const handleAddTier = () => {
      setFormData(prev => ({...prev, pricingTiers: [...(prev.pricingTiers || []), { id: `T-${Math.random().toString(36).substring(2, 9)}`, name: '', price: 0, currency: formData.currency || 'ARS' }]}))
  }

  const handleTierChange = (id: string, field: 'name' | 'price' | 'currency', value: string | number) => {
      const processedValue = field === 'price' && value === '' ? '' : value;
      setFormData(prev => ({...prev, pricingTiers: (prev.pricingTiers || []).map(tier => 
          tier.id === id ? { ...tier, [field]: processedValue } : tier
      )}));
  }

  const handleRemoveTier = (id: string) => {
    setFormData(prev => ({...prev, pricingTiers: (prev.pricingTiers || []).filter(tier => tier.id !== id)}));
  }
  
  const handleHotelCostChange = (field: 'amount' | 'currency', value: any) => {
      const currentHotelCost = formData.costs?.hotel || { amount: 0, currency: 'ARS' };
      const valToSet = field === 'amount' ? (value === '' ? 0 : parseFloat(value) || 0) : value;
      setFormData(prev => ({...prev, costs: {...prev.costs!, hotel: { ...currentHotelCost, [field]: valToSet }}}));
  }


  const handleAddExtraCost = () => {
    setFormData(prev => ({...prev, costs: {...prev.costs, extras: [...(prev.costs?.extras || []), {id: `E-${Math.random().toString(36).substring(2, 9)}`, description: '', amount: 0, currency: formData.currency || 'ARS'}]}}));
  }

  const handleExtraCostChange = (id: string, field: 'description' | 'amount' | 'currency', value: string | number) => {
    const processedValue = field === 'amount' && value === '' ? '' : value;
    setFormData(prev => ({ ...prev, costs: {...prev.costs, extras: (prev.costs?.extras || []).map(c => c.id === id ? {...c, [field]: processedValue} : c)}}));
  }

  const handleRemoveExtraCost = (id: string) => {
    setFormData(prev => ({ ...prev, costs: {...prev.costs, extras: (prev.costs?.extras || []).filter(c => c.id !== id)}}));
  }

  const handleBackgroundImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          setBackgroundImageFile(file);
          const reader = new FileReader();
          reader.onload = (event) => {
              setBackgroundImagePreview(event.target?.result as string);
          };
          reader.readAsDataURL(file);
      }
  };
  
  const handleGalleryFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files) {
          const newFiles: GalleryFile[] = Array.from(files).map(file => ({
              file,
              previewUrl: URL.createObjectURL(file),
              type: file.type.startsWith('video') ? 'video' : 'image',
              id: `new-${Date.now()}-${Math.random()}`
          }));

          setNewGalleryFiles(prev => [...prev, ...newFiles]);

          // If there's no main background image, set the first new image as the main one
          if (!backgroundImagePreview) {
              const firstNewImage = newFiles.find(f => f.type === 'image');
              if (firstNewImage) {
                  setBackgroundImagePreview(firstNewImage.previewUrl);
                  setBackgroundImageFile(firstNewImage.file);
              }
          }
      }
  };

  const removeNewGalleryFile = (id: string) => {
    const fileToRemove = newGalleryFiles.find(f => f.id === id);
    if (!fileToRemove) return;

    const wasBackgroundImage = fileToRemove.previewUrl === backgroundImagePreview;
    const updatedNewFiles = newGalleryFiles.filter(f => f.id !== id);
    setNewGalleryFiles(updatedNewFiles);

    if (wasBackgroundImage) {
        setBackgroundImageFile(null);
        const remainingImages = [
            ...(formData.gallery || []).filter(item => item.type === 'image'),
            ...updatedNewFiles.filter(item => item.type === 'image')
        ];
        const nextImageUrl = remainingImages.length > 0 ? getDisplayUrl((remainingImages[0] as any).url || (remainingImages[0] as any).previewUrl) : null;
        setBackgroundImagePreview(nextImageUrl);
    }
  }
  
  const removeExistingGalleryItem = (id: string) => {
    const itemToRemove = formData.gallery?.find(g => g.id === id);
    if (!itemToRemove) return;

    const wasBackgroundImage = itemToRemove.url === formData.backgroundImage;
    const updatedGallery = (formData.gallery || []).filter(g => g.id !== id);
    handleFormChange('gallery', updatedGallery);

    if (wasBackgroundImage) {
        setBackgroundImageFile(null);
        const remainingImages = [
            ...updatedGallery.filter(item => item.type === 'image'),
            ...newGalleryFiles.filter(item => item.type === 'image')
        ];
        const nextImageUrl = remainingImages.length > 0 ? getDisplayUrl((remainingImages[0] as any).url || (remainingImages[0] as any).previewUrl) : null;
        setBackgroundImagePreview(nextImageUrl);
    }
  }

  const setAsBackgroundImage = (url: string | null, file: File | null = null) => {
    setBackgroundImagePreview(url);
    setBackgroundImageFile(file);
  }

  const handleSubmit = async () => {
    const { destination, date, price } = formData;
    if (!destination || !date || price === null || Number(price) <= 0) {
      toast({ title: "Faltan datos", description: "Por favor, completa destino, fecha y un precio válido.", variant: "destructive" });
      return;
    }

    if (transportUnits.length === 0 || transportUnits.some(u => !u.type)) {
        toast({ title: "Transporte incompleto", description: "Debes agregar al menos una unidad de transporte y seleccionar su tipo.", variant: "destructive" });
        return;
    }
    
    setIsLoading(true);

    try {
        let finalBackgroundImageUrl = formData.backgroundImage;
        if (backgroundImageFile) {
            finalBackgroundImageUrl = await fileToDataUrl(backgroundImageFile);
        }
        
        const uploadedGalleryItems: GalleryItem[] = [];
        for (const galleryFile of newGalleryFiles) {
            const dataUrl = await fileToDataUrl(galleryFile.file);
            uploadedGalleryItems.push({
                id: `G-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
                url: dataUrl,
                type: galleryFile.type,
            });
        }
        
        const combinedGallery = [...(formData.gallery || []), ...uploadedGalleryItems];
        
        const tourDataToSave: Tour = {
            id: tour?.id || '', // ID will be handled in the parent onSave
            ...formData,
            backgroundImage: finalBackgroundImageUrl,
            price: Number(formData.price) || 0,
            costs: {
                ...formData.costs,
                hotel: {
                    amount: Number(formData.costs?.hotel?.amount) || 0,
                    currency: formData.costs?.hotel?.currency || 'ARS'
                },
                transport: (formData.costs?.transport || []).map(c => ({ ...c, amount: Number(c.amount) || 0, currency: c.currency || 'ARS' })),
                extras: (formData.costs?.extras || []).map(c => ({ ...c, amount: Number(c.amount) || 0, currency: c.currency || 'ARS' })),
            },
            pricingTiers: (formData.pricingTiers || []).map(t => ({ ...t, price: Number(t.price) || 0, currency: t.currency || 'ARS' })).filter(t => t.name),
            transportUnits,
            gallery: combinedGallery,
        };
  
        onSave(tourDataToSave);
        setIsLoading(false);
        
    } catch (error) {
      console.error("Error preparing to save tour:", error);
      toast({ title: "Error", description: "Ocurrió un problema al procesar los archivos.", variant: "destructive" });
      setIsLoading(false);
    }
  };


  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl flex flex-col max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>{tour ? "Editar Viaje" : "Crear Nuevo Viaje"}</DialogTitle>
          <DialogDescription>
            {tour ? "Modifica los detalles del viaje." : "Completa los detalles para crear un nuevo viaje."}
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto pr-6 -mr-6">
            <div className="py-4 space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="destination">Destino</Label>
                    <Input id="destination" value={formData.destination} onChange={(e) => handleFormChange('destination', e.target.value)} />
                </div>
                 <div className="space-y-2">
                    <Label>Etiquetas</Label>
                    <div className="flex flex-wrap gap-2 p-2 border rounded-md">
                        {availableTags.map(tag => (
                            <Button 
                                key={tag} 
                                variant={formData.tags?.includes(tag) ? "default" : "outline"}
                                size="sm"
                                onClick={() => handleToggleTag(tag)}
                                className="rounded-full"
                            >
                                {tag}
                            </Button>
                        ))}
                         {availableTags.length === 0 && <p className="text-xs text-muted-foreground">No hay etiquetas creadas. Ve a Configuración para añadirlas.</p>}
                    </div>
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
                <div className="space-y-2">
                  <Label htmlFor="description">Descripción del Viaje (Opcional)</Label>
                  <Textarea id="description" value={formData.description || ''} onChange={(e) => handleFormChange('description', e.target.value)} placeholder="Describe el itinerario, qué incluye, etc." className="h-32"/>
                </div>

                <div className="space-y-4 pt-2">
                    <Accordion type="multiple" className="w-full" defaultValue={['gallery', 'general', 'transport', 'costs']}>
                         <AccordionItem value="gallery">
                            <AccordionTrigger className="text-base font-medium">Galería Multimedia</AccordionTrigger>
                            <AccordionContent className="pt-4 space-y-4">
                                <div className="space-y-2">
                                  <Label htmlFor="background-image-file">Imagen Principal del Viaje</Label>
                                  <Input id="background-image-file" type="file" accept="image/*" onChange={handleBackgroundImageFileChange}/>
                                   {backgroundImagePreview && <Image src={getDisplayUrl(backgroundImagePreview)} alt="Vista previa" width={300} height={150} className="rounded-md object-cover mt-2"/>}
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="gallery-files">Añadir Imágenes y Videos a la Galería</Label>
                                  <Input id="gallery-files" type="file" accept="image/*,video/*" multiple onChange={handleGalleryFilesChange} />
                                </div>
                                <div className="space-y-4">
                                    { (formData.gallery && formData.gallery.filter(g => g.type === 'image').length > 0) || newGalleryFiles.filter(f => f.type === 'image').length > 0 ? (
                                        <div>
                                            <h4 className="font-semibold mb-2">Imágenes</h4>
                                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                                {(formData.gallery || []).filter(g => g.type === 'image').map(item => (
                                                    <div key={item.id} className="relative group aspect-square">
                                                        <Image src={getDisplayUrl(item.url)} alt="Galería" layout="fill" objectFit="cover" className={cn("rounded-md transition-all", backgroundImagePreview === item.url && "ring-2 ring-offset-2 ring-primary")} />
                                                         <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-2">
                                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-white hover:text-yellow-400" onClick={() => setAsBackgroundImage(item.url)} title="Usar como imagen principal">
                                                                <Star className={cn(backgroundImagePreview === item.url && "fill-yellow-400 text-yellow-400")}/>
                                                            </Button>
                                                            <Button size="icon" variant="destructive" className="h-8 w-8" onClick={() => removeExistingGalleryItem(item.id)}><Trash2 className="w-4 h-4"/></Button>
                                                        </div>
                                                    </div>
                                                ))}
                                                {newGalleryFiles.filter(f => f.type === 'image').map(file => (
                                                    <div key={file.id} className="relative group aspect-square">
                                                        <Image src={file.previewUrl} alt="Vista previa" layout="fill" objectFit="cover" className={cn("rounded-md transition-all", backgroundImagePreview === file.previewUrl && "ring-2 ring-offset-2 ring-primary")} />
                                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-2">
                                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-white hover:text-yellow-400" onClick={() => setAsBackgroundImage(file.previewUrl, file.file)} title="Usar como imagen principal">
                                                                <Star className={cn(backgroundImagePreview === file.previewUrl && "fill-yellow-400 text-yellow-400")}/>
                                                            </Button>
                                                            <Button size="icon" variant="destructive" className="h-8 w-8" onClick={() => removeNewGalleryFile(file.id)}><Trash2 className="w-4 h-4"/></Button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ) : null}
                                     { (formData.gallery && formData.gallery.filter(g => g.type === 'video').length > 0) || newGalleryFiles.filter(f => f.type === 'video').length > 0 ? (
                                        <div>
                                            <h4 className="font-semibold mb-2">Videos</h4>
                                             <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                                {(formData.gallery || []).filter(g => g.type === 'video').map(item => (
                                                    <div key={item.id} className="relative group aspect-video">
                                                        <video src={getDisplayUrl(item.url)} className="w-full h-full object-cover rounded-md"/>
                                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                            <Button size="icon" variant="destructive" onClick={() => removeExistingGalleryItem(item.id)}><Trash2 className="w-4 h-4"/></Button>
                                                        </div>
                                                    </div>
                                                ))}
                                                {newGalleryFiles.filter(f => f.type === 'video').map(file => (
                                                    <div key={file.id} className="relative group aspect-video">
                                                        <video src={file.previewUrl} className="w-full h-full object-cover rounded-md"/>
                                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                            <Button size="icon" variant="destructive" onClick={() => removeNewGalleryFile(file.id)}><Trash2 className="w-4 h-4"/></Button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ) : null}
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                         <AccordionItem value="general">
                            <AccordionTrigger className="text-base font-medium">Información para Tickets</AccordionTrigger>
                            <AccordionContent className="pt-4 space-y-4">
                               <div className="grid grid-cols-2 gap-4">
                                  <div className="space-y-2"><Label>Origen</Label><Input value={formData.origin} onChange={(e) => handleFormChange('origin', e.target.value)} /></div>
                                  <div className="space-y-2"><Label>Días</Label><Input type="number" value={formData.days === 0 ? '' : formData.days} onChange={(e) => handleFormChange('days', e.target.value === '' ? '' : parseInt(e.target.value) || 0)} /></div>
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
                                   <div className="flex gap-2">
                                        <Input type="number" value={formData.costs?.hotel?.amount || ''} onChange={(e) => handleHotelCostChange('amount', e.target.value)} placeholder="0"/>
                                        <Select value={formData.costs?.hotel?.currency || formData.currency} onValueChange={(value) => handleHotelCostChange('currency', value)}>
                                            <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
                                            <SelectContent><SelectItem value="ARS">ARS</SelectItem><SelectItem value="USD">USD</SelectItem></SelectContent>
                                        </Select>
                                   </div>
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
                                                <Input type="number" value={cost.amount || ''} onChange={e => handleCostChange(index, 'amount', e.target.value)} className="w-28"/>
                                                <Select value={cost.currency || formData.currency} onValueChange={(value) => handleCostChange(index, 'currency', value)}>
                                                    <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
                                                    <SelectContent><SelectItem value="ARS">ARS</SelectItem><SelectItem value="USD">USD</SelectItem></SelectContent>
                                                </Select>
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
                                          className="w-28"
                                        />
                                        <Select value={cost.currency || formData.currency} onValueChange={(value) => handleExtraCostChange(cost.id, 'currency', value)}>
                                            <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
                                            <SelectContent><SelectItem value="ARS">ARS</SelectItem><SelectItem value="USD">USD</SelectItem></SelectContent>
                                        </Select>
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
                                          className="w-28"
                                        />
                                         <Select value={tier.currency || formData.currency} onValueChange={(value) => handleTierChange(tier.id, 'currency', value)}>
                                            <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
                                            <SelectContent><SelectItem value="ARS">ARS</SelectItem><SelectItem value="USD">USD</SelectItem></SelectContent>
                                        </Select>
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
             {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isLoading ? "Guardando..." : "Guardar Cambios"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
