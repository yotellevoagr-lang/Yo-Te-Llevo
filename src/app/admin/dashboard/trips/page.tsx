

"use client"

import { useState, useMemo, useEffect } from "react"
import {
  Card,
  CardContent,
} from "@/components/ui/card"
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { PlusCircle, MoreHorizontal, Edit, Trash2, FileText, ShieldAlert } from "lucide-react"
import type { Tour, Reservation, LayoutCategory, TransportUnit, BoardingPoint, GeneralSettings, CustomLayoutConfig } from "@/lib/types"
import { TripForm } from "@/components/admin/trip-form"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { getAllFromCollection_client, getDocumentById, saveTour, deleteDocument, saveDocument } from "@/lib/firestore-services"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"


type GlobalTextType = 'observations' | 'cancellationPolicy' | null;

const MAX_POPUP_TOURS = 3;

export default function TripsPage() {
  const [tours, setTours] = useState<Tour[]>([])
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [boardingPoints, setBoardingPoints] = useState<BoardingPoint[]>([]);
  const [layoutConfig, setLayoutConfig] = useState<Record<LayoutCategory, Record<string, CustomLayoutConfig>>>({ vehicles: {}, airplanes: {}, cruises: {} });
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [selectedTour, setSelectedTour] = useState<Tour | null>(null)
  
  const [globalTextType, setGlobalTextType] = useState<GlobalTextType>(null);
  const [generalSettings, setGeneralSettings] = useState<GeneralSettings | null>(null);
  const [globalText, setGlobalText] = useState("");
  const { toast } = useToast();

  const fetchData = async () => {
    const [toursData, reservationsData, boardingPointsData, settingsData, layoutConfigData] = await Promise.all([
      getAllFromCollection_client<Tour>('tours'),
      getAllFromCollection_client<Reservation>('reservations'),
      getAllFromCollection_client<BoardingPoint>('boarding_points'),
      getDocumentById<GeneralSettings>('settings', 'general'),
      getDocumentById<any>('settings', 'layouts')
    ]);

    const processedTours = toursData.map(t => {
      // Firestore Timestamps need to be converted to JS Date objects
      const date = (t.date as any)?.toDate ? (t.date as any).toDate() : new Date(t.date);
      return { ...t, date };
    });

    setTours(processedTours);
    setReservations(reservationsData);
    setBoardingPoints(boardingPointsData);
    if(settingsData) {
      setGeneralSettings(settingsData);
    }
    if(layoutConfigData) setLayoutConfig(layoutConfigData);
  }

  useEffect(() => {
    fetchData();
  }, [])
  
  useEffect(() => {
    if (globalTextType === 'observations' && generalSettings) {
      setGlobalText(generalSettings.observations || "");
    } else if (globalTextType === 'cancellationPolicy' && generalSettings) {
      setGlobalText(generalSettings.cancellationPolicy || "");
    }
  }, [globalTextType, generalSettings]);

  const activeTours = useMemo(() => tours.filter(tour => tour.date && new Date(tour.date) >= new Date()), [tours]);
  
  const getOccupiedCount = (tourId: string) => {
    return reservations
        .filter(r => r.tripId === tourId)
        .reduce((sum, r) => sum + r.paxCount, 0);
  }

  const getTourCapacity = (tour: Tour): number => {
    if (!tour.transportUnits || !layoutConfig) return 0;
    return tour.transportUnits.reduce((acc, unit) => {
        const config = layoutConfig[unit.category]?.[unit.type];
        return acc + (config?.capacity || 0);
    }, 0);
  }

  const getTransportUnitsByType = (tour: Tour): Partial<Record<LayoutCategory, number>> => {
    if (!tour.transportUnits) return {};
    return tour.transportUnits.reduce((acc, unit) => {
      acc[unit.category] = (acc[unit.category] || 0) + 1;
      return acc;
    }, {} as Partial<Record<LayoutCategory, number>>);
  };

  const activeTransportTypes = useMemo(() => {
    const types = new Set<LayoutCategory>();
    activeTours.forEach(tour => {
      if (tour.transportUnits) {
        tour.transportUnits.forEach(unit => types.add(unit.category));
      }
    });
    return Array.from(types);
  }, [activeTours]);

  const hasFeaturedTours = useMemo(() => activeTours.some(t => t.isFeatured), [activeTours]);

  const handleCreate = () => {
    setSelectedTour(null)
    setIsFormOpen(true)
  }

  const handleEdit = (tour: Tour) => {
    setSelectedTour(tour)
    setIsFormOpen(true)
  }

  const handleSave = async (tourData: Tour) => {
    const tourToSave: Partial<Tour> = { ...tourData };
    
    if (!tourToSave.id) {
        const globalSettings = await getDocumentById<GeneralSettings>('settings', 'general');
        tourToSave.observations = globalSettings?.observations || "";
        tourToSave.cancellationPolicy = globalSettings?.cancellationPolicy || "";
    }
    
    await saveTour(tourToSave, tourToSave.id);
    await fetchData();

    // Notify other tabs that data has changed
    window.dispatchEvent(new Event('storage'));

    setIsFormOpen(false);
    setSelectedTour(null);
    toast({title: "Viaje Guardado", description: "Los datos del viaje han sido actualizados."})
  };

  const handleDelete = async (tourId: string) => {
    await deleteDocument('tours', tourId);
    await fetchData();
    window.dispatchEvent(new Event('storage'));
    toast({title: "Viaje Eliminado", variant: "destructive"})
  }
  
  const handleSaveGlobalText = async () => {
    if (!globalTextType) return;

    const currentSettings = await getDocumentById<GeneralSettings>('settings', 'general') || {};
    let updatedSettings: GeneralSettings = {
        ...currentSettings,
        [globalTextType]: globalText
    };

    await saveDocument('settings', updatedSettings, 'general');
    await fetchData();
    window.dispatchEvent(new Event('storage'));
    toast({ title: `Texto global de "${globalTextType === 'observations' ? 'Observaciones' : 'Política de Cancelación'}" guardado.` });
    setGlobalTextType(null);
  }

  const handleToggleChange = async (tour: Tour, field: 'isPublic' | 'isFeatured' | 'showAsPopup', value: boolean) => {
    let updatedTour: Tour = { ...tour, [field]: value };
    
    // If we're setting a tour as popup, check the limit.
    if (field === 'showAsPopup' && value) {
        const popupCount = tours.filter(t => t.showAsPopup).length;
        if (popupCount >= MAX_POPUP_TOURS) {
            toast({
                title: "Límite de Popups alcanzado",
                description: `Solo puedes tener ${MAX_POPUP_TOURS} viajes en el popup a la vez. Desactiva otro primero.`,
                variant: "destructive"
            });
            return; // Prevent update
        }
    }
    
    // If a trip is no longer featured, it can't be a popup.
    if (field === 'isFeatured' && !value) {
        updatedTour.showAsPopup = false;
    }


    await saveTour(updatedTour, tour.id);
    setTours(prevTours => prevTours.map(t => t.id === tour.id ? updatedTour : t));
    window.dispatchEvent(new Event('storage'));
    
    let message = "";
    if (field === 'isPublic') message = `El viaje a ${tour.destination} ahora es ${value ? 'público' : 'privado'}.`;
    if (field === 'isFeatured') message = `El viaje a ${tour.destination} ahora ${value ? 'es destacado' : 'ya no es destacado'}.`;
    if (field === 'showAsPopup') message = `El viaje a ${tour.destination} ${value ? 'se mostrará en el popup' : 'ya no se mostrará en el popup'}.`;

    toast({ title: "Visibilidad actualizada", description: message });
  }
  
  const isDialogForObservations = globalTextType === 'observations';

  return (
    <div className="space-y-6">
      <Dialog open={!!globalTextType} onOpenChange={(open) => !open && setGlobalTextType(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isDialogForObservations ? "Observaciones Globales" : "Política de Cancelación Global"}
            </DialogTitle>
            <DialogDescription>
              {isDialogForObservations 
                ? "Este texto se añadirá a todos los viajes nuevos y existentes. Ideal para información importante y recurrente."
                : "Define la política de cancelación que se aplicará a todos los viajes."}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-2">
              <Label htmlFor="global-textarea">{isDialogForObservations ? "Observaciones" : "Política de Cancelación"}</Label>
              <Textarea 
                id="global-textarea"
                value={globalText}
                onChange={(e) => setGlobalText(e.target.value)}
                className="h-48"
              />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGlobalTextType(null)}>Cancelar</Button>
            <Button onClick={handleSaveGlobalText}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      <TripForm
        isOpen={isFormOpen}
        onOpenChange={setIsFormOpen}
        onSave={handleSave}
        tour={selectedTour}
        boardingPoints={boardingPoints}
      />
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Gestión de Viajes</h2>
          <p className="text-muted-foreground">
            Aquí podrás crear, editar y eliminar los viajes. Los viajes pasados se ocultan automáticamente.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 self-end sm:self-center">
            <Button variant="outline" onClick={() => setGlobalTextType('observations')}>
              <FileText className="mr-2 h-4 w-4" /> Observaciones
            </Button>
            <Button variant="outline" onClick={() => setGlobalTextType('cancellationPolicy')}>
              <ShieldAlert className="mr-2 h-4 w-4" /> Política Cancelación
            </Button>
            <Button onClick={handleCreate}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Crear Nuevo Viaje
            </Button>
        </div>
      </div>
      <Card>
        <CardContent className="pt-6">
          <div className="w-full overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Público</TableHead>
                  <TableHead>Destacado</TableHead>
                  {hasFeaturedTours && <TableHead>Popup</TableHead>}
                  <TableHead>Destino</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Precio</TableHead>
                  <TableHead>Asientos</TableHead>
                  {activeTransportTypes.includes('vehicles') && <TableHead>Vehículos</TableHead>}
                  {activeTransportTypes.includes('airplanes') && <TableHead>Aviones</TableHead>}
                  {activeTransportTypes.includes('cruises') && <TableHead>Cruceros</TableHead>}
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeTours.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="h-24 text-center">
                      No hay viajes activos.
                    </TableCell>
                  </TableRow>
                ) : activeTours.map((tour) => {
                  const occupiedCount = getOccupiedCount(tour.id);
                  const capacity = getTourCapacity(tour);
                  const availableSeats = capacity - occupiedCount;
                  const unitsByType = getTransportUnitsByType(tour);
                  const currencySymbol = tour.currency === 'USD' ? 'U$S' : '$';

                  return (
                    <TableRow key={tour.id} className={cn(!tour.isPublic && "bg-orange-50", tour.isFeatured && "bg-pink-100 hover:bg-pink-200")}>
                      <TableCell>
                          <Switch
                              checked={tour.isPublic}
                              onCheckedChange={(checked) => handleToggleChange(tour, 'isPublic', checked)}
                              aria-label="Publicar viaje"
                          />
                      </TableCell>
                       <TableCell>
                          <Switch
                              checked={tour.isFeatured}
                              onCheckedChange={(checked) => handleToggleChange(tour, 'isFeatured', checked)}
                              aria-label="Marcar como destacado"
                          />
                      </TableCell>
                      {hasFeaturedTours && (
                        <TableCell>
                          {tour.isFeatured && (
                             <Switch
                                checked={tour.showAsPopup}
                                onCheckedChange={(checked) => handleToggleChange(tour, 'showAsPopup', checked)}
                                aria-label="Mostrar en popup"
                            />
                          )}
                        </TableCell>
                      )}
                      <TableCell className="font-medium">{tour.destination}</TableCell>
                      <TableCell>
                        {new Date(tour.date).toLocaleDateString("es-AR", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </TableCell>
                      <TableCell>{currencySymbol}{tour.price.toLocaleString("es-AR")}</TableCell>
                      <TableCell>
                         <div className="flex items-center gap-2">
                            <Badge variant="secondary">Ocup: {occupiedCount}</Badge>
                            <Badge variant={availableSeats > 5 ? "default" : "destructive"}>Disp: {availableSeats}</Badge>
                          </div>
                      </TableCell>
                      {activeTransportTypes.includes('vehicles') && <TableCell>{unitsByType.vehicles || 0}</TableCell>}
                      {activeTransportTypes.includes('airplanes') && <TableCell>{unitsByType.airplanes || 0}</TableCell>}
                      {activeTransportTypes.includes('cruises') && <TableCell>{unitsByType.cruises || 0}</TableCell>}
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Abrir menú</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(tour)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDelete(tour.id)} className="text-destructive">
                              <Trash2 className="mr-2 h-4 w-4" />
                              Eliminar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
