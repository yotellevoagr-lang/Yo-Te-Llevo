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
import { useToast } from "@/hooks/use-toast"
import type { Tour, Flyer } from "@/lib/types"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "../ui/checkbox"
import Image from "next/image"
import { Loader2 } from "lucide-react"
import { getDisplayUrl } from "@/lib/utils"
import { uploadFileToStorage, deleteFileFromStorage, isStorageUrl } from "@/lib/storage-service"

interface FlyerFormProps {
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
  onSave: (flyerData: Omit<Flyer, 'id'> & { id?: string }) => void
  flyer: Flyer | null
  tours: Tour[]
}

const defaultFlyerState: Omit<Flyer, 'id' | 'url' | 'type'> = {
    name: "",
    tourId: null,
    isGeneralPromotion: false,
}

const fileToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
        reader.readAsDataURL(file);
    });
};

export function FlyerForm({ isOpen, onOpenChange, onSave, flyer, tours }: FlyerFormProps) {
  const [formData, setFormData] = useState(defaultFlyerState)
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
        if (flyer) {
            setFormData({
                name: flyer.name,
                tourId: flyer.tourId,
                isGeneralPromotion: flyer.isGeneralPromotion
            });
            setPreviewUrl(flyer.url);
            setMediaType(flyer.type);
        } else {
            setFormData(defaultFlyerState);
            setPreviewUrl(null);
        }
        setFile(null); // Always reset file on open
        setIsUploading(false); // Reset loading state
    }
  }, [flyer, isOpen])

  const handleFormChange = (id: keyof typeof formData, value: any) => {
    setFormData(prev => ({ ...prev, [id]: value }));
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
        setFile(selectedFile);
        const url = URL.createObjectURL(selectedFile);
        setPreviewUrl(url); 
        setMediaType(selectedFile.type.startsWith('video') ? 'video' : 'image');
    }
  }

  const handleSubmit = async () => {
    if (!flyer && !file) {
        toast({ title: "Falta el archivo", description: "Por favor, sube una imagen o video.", variant: "destructive" });
        return;
    }
    
    setIsUploading(true);

    let uploadedUrl: string | null = null;
    try {
        let mediaUrl = flyer?.url || '';
        const previousUrl = flyer?.url;

        if (file) {
            uploadedUrl = await uploadFileToStorage(file, 'flyers');
            mediaUrl = uploadedUrl;
        }
        
        const finalData = { 
            ...formData, 
            id: flyer?.id,
            url: mediaUrl,
            type: mediaType 
        };
        onSave(finalData);
        
        if (file && previousUrl && isStorageUrl(previousUrl)) {
            const deleted = await deleteFileFromStorage(previousUrl);
            if (!deleted) {
                console.warn('No se pudo eliminar el archivo anterior del Storage');
            }
        }
        
    } catch (error) {
        console.error("Error uploading file:", error);
        if (uploadedUrl) {
            await deleteFileFromStorage(uploadedUrl);
        }
        toast({ title: "Error al subir archivo", description: "No se pudo subir el archivo. Verifica tu conexión.", variant: "destructive"});
    } finally {
        setIsUploading(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!isUploading) onOpenChange(open); }}>
      <DialogContent className="sm:max-w-lg flex flex-col max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>{flyer ? "Editar Flyer" : "Subir Nuevo Flyer"}</DialogTitle>
          <DialogDescription>
            {flyer ? "Modifica los detalles del flyer." : "Completa los detalles para subir un nuevo flyer."}
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-grow overflow-y-auto pr-6 -mr-6">
            <div className="py-4 space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="name">Nombre / Título del Flyer (Opcional)</Label>
                    <Input id="name" value={formData.name} onChange={(e) => handleFormChange('name', e.target.value)} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="tourId">Asociar a un Viaje (Opcional)</Label>
                    <Select value={formData.tourId || 'none'} onValueChange={(val) => handleFormChange('tourId', val === 'none' ? null : val)}>
                        <SelectTrigger id="tourId"><SelectValue placeholder="Seleccionar viaje..."/></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">Sin asociar</SelectItem>
                            {tours.map(t => <SelectItem key={t.id} value={t.id}>{t.destination}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                <div className="flex items-center space-x-2">
                    <Checkbox id="isGeneralPromotion" checked={formData.isGeneralPromotion} onCheckedChange={(checked) => handleFormChange('isGeneralPromotion', !!checked)} />
                    <Label htmlFor="isGeneralPromotion">Es una promoción general (no asociada a un viaje específico)</Label>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="file">Archivo (Imagen o Video)</Label>
                    <Input id="file" type="file" accept="image/*,video/*" onChange={handleFileChange} />
                </div>
                {previewUrl && (
                    <div className="space-y-2">
                        <Label>Vista Previa</Label>
                        <div className="border rounded-md p-2 flex justify-center items-center bg-muted">
                            {mediaType === 'video' ? (
                                <video src={getDisplayUrl(previewUrl)} controls className="max-h-60 rounded" />
                            ) : (
                                <Image src={getDisplayUrl(previewUrl)} alt="Vista previa" width={200} height={300} className="max-h-60 w-auto object-contain rounded"/>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
        
        <DialogFooter className="mt-auto pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isUploading}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={isUploading}>
            {isUploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isUploading ? "Subiendo..." : "Guardar Flyer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
