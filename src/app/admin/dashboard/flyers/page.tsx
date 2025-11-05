

"use client"

import { useState, useMemo, useEffect } from "react"
import {
  Card,
  CardContent,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { PlusCircle, MoreHorizontal, Edit, Trash2, Maximize } from "lucide-react"
import type { Tour, Flyer } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"
import { getAllFromCollection_client, deleteDocument, saveDocument } from "@/lib/firestore-services"
import { FlyerForm } from "@/components/admin/flyer-form"
import Image from "next/image"
import { getDisplayUrl } from "@/lib/utils"

export default function FlyersPage() {
  const [flyers, setFlyers] = useState<Flyer[]>([])
  const [tours, setTours] = useState<Tour[]>([])
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [selectedFlyer, setSelectedFlyer] = useState<Flyer | null>(null)
  const [viewingMedia, setViewingMedia] = useState<{ url: string; type: 'image' | 'video' } | null>(null);
  const { toast } = useToast();

  const fetchData = async () => {
    const [flyersData, toursData] = await Promise.all([
      getAllFromCollection_client<Flyer>('flyers'),
      getAllFromCollection_client<Tour>('tours'),
    ]);
    const processedTours = toursData.map(t => {
      const date = (t.date as any)?.toDate ? (t.date as any).toDate() : new Date(t.date);
      return { ...t, date };
    });
    setFlyers(flyersData);
    setTours(processedTours);
  }

  useEffect(() => {
    fetchData();
  }, [])
  
  const activeTours = useMemo(() => {
    if (!tours) return [];
    return tours.filter(t => t.date && new Date(t.date) >= new Date());
  }, [tours]);


  const handleCreate = () => {
    setSelectedFlyer(null)
    setIsFormOpen(true)
  }

  const handleEdit = (flyer: Flyer) => {
    setSelectedFlyer(flyer)
    setIsFormOpen(true)
  }

  const handleFlyerSave = async (flyerData: Omit<Flyer, 'id'> & { id?: string }) => {
    try {
        await saveDocument('flyers', flyerData, flyerData.id || undefined);
        window.dispatchEvent(new Event('storage'));
        toast({ title: "¡Guardado!", description: "El flyer ha sido guardado correctamente." });
        await fetchData(); 
        setIsFormOpen(false); 
    } catch (error) {
        console.error("Error saving flyer:", error);
        toast({ title: "Error", description: "No se pudo guardar el flyer.", variant: "destructive" });
    }
  };


  const handleDelete = async (flyerId: string) => {
    await deleteDocument('flyers', flyerId);
    await fetchData();
    window.dispatchEvent(new Event('storage'));
    toast({ title: "Flyer eliminado", variant: "destructive" })
  }

  const handleView = (flyer: Flyer) => {
    setViewingMedia({ url: flyer.url, type: flyer.type });
    setIsViewerOpen(true);
  }
  
  const getTourName = (tourId: string) => {
    return tours.find(t => t.id === tourId)?.destination || 'Sin Asignar';
  }

  return (
    <div className="space-y-6">
       <Dialog open={isViewerOpen} onOpenChange={setIsViewerOpen}>
            <DialogContent className="max-w-4xl max-h-[90vh]">
                <DialogHeader>
                    <DialogTitle>Vista Previa del Flyer</DialogTitle>
                </DialogHeader>
                <div className="flex justify-center items-center p-4">
                    {viewingMedia?.type === 'video' ? (
                        <video src={getDisplayUrl(viewingMedia.url)} controls autoPlay className="max-w-full max-h-[75vh] rounded-lg" />
                    ) : (
                        <Image src={getDisplayUrl(viewingMedia?.url || '')} alt="Vista previa del flyer" width={800} height={800} className="max-w-full max-h-[75vh] object-contain rounded-lg"/>
                    )}
                </div>
            </DialogContent>
        </Dialog>
      <FlyerForm
        isOpen={isFormOpen}
        onOpenChange={setIsFormOpen}
        onSave={handleFlyerSave}
        flyer={selectedFlyer}
        tours={activeTours}
      />
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Gestión de Flyers</h2>
          <p className="text-muted-foreground">
            Sube, edita o elimina los flyers promocionales de los viajes.
          </p>
        </div>
        <Button onClick={handleCreate}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Subir Nuevo Flyer
        </Button>
      </div>
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {flyers.length === 0 ? (
                 <p className="col-span-full text-center text-muted-foreground py-10">No hay flyers cargados.</p>
            ) : flyers.map((flyer) => (
                <Card key={flyer.id} className="overflow-hidden group flex flex-col">
                    <div className="relative w-full aspect-[9/16]">
                        {flyer.type === 'video' ? (
                            <video src={getDisplayUrl(flyer.url)} className="absolute inset-0 w-full h-full object-cover"/>
                        ) : (
                           <Image src={getDisplayUrl(flyer.url)} alt={flyer.name} layout="fill" objectFit="cover" />
                        )}
                        <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                             <Button variant="secondary" onClick={() => handleView(flyer)}>
                                <Maximize className="mr-2 h-4 w-4"/> Ver
                            </Button>
                        </div>
                    </div>
                    <div className="p-4 flex flex-col flex-grow">
                        <h3 className="font-semibold truncate">{flyer.name}</h3>
                        <p className="text-sm text-muted-foreground">{getTourName(flyer.tourId || '')}</p>
                        <p className="text-xs text-blue-500">{flyer.isGeneralPromotion ? 'Promoción General' : ''}</p>
                         <div className="flex justify-end pt-2 mt-auto">
                             <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                    <span className="sr-only">Abrir menú</span>
                                    <MoreHorizontal className="h-4 w-4" />
                                </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleEdit(flyer)}>
                                    <Edit className="mr-2 h-4 w-4" />
                                    Editar
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDelete(flyer.id)} className="text-destructive">
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Eliminar
                                </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                         </div>
                    </div>
                </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
