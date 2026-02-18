"use client"

import { useState, useMemo, useEffect } from "react";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import jsPDF from "jspdf";
import "jspdf-autotable";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Tour, Reservation, Passenger, Ticket, BoardingPoint } from "@/lib/types";
import { Separator } from "@/components/ui/separator";
import { Download, Copy, Users, GripVertical, Settings2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { getAllFromCollection_client } from "@/lib/firestore-services";
import { generateDisplayID } from "@/lib/utils";

interface DataExporterProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

const dataColumns = {
  ticketId: "T-ID",
  fullName: "Nombre",
  dni: "DNI",
  age: "Edad",
  dob: "F. Nacimiento",
  boardingPoint: "Embarque",
  assignedSeat: "Asiento",
};

const calculateAge = (dob: any) => {
  if (!dob) return "";
  const birthDate = dob?.toDate ? dob.toDate() : new Date(dob);
  if (isNaN(birthDate.getTime())) return "";
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return String(age);
};


// Sortable Item Component for dnd-kit
function SortableItem({ id, name }: { id: string; name: string }) {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div ref={setNodeRef} style={style} {...attributes} className="flex items-center gap-2 p-2 bg-background rounded-md border">
            <button {...listeners} className="cursor-grab p-1">
                <GripVertical className="h-5 w-5 text-muted-foreground" />
            </button>
            <span className="font-mono text-xs text-muted-foreground">[{id}]</span>
            <span className="font-medium">{name}</span>
        </div>
    );
}

export function DataExporter({ isOpen, onOpenChange }: DataExporterProps) {
  const { toast } = useToast();
  const [tours, setTours] = useState<Tour[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [passengers, setPassengers] = useState<Passenger[]>([]);
  const [boardingPoints, setBoardingPoints] = useState<BoardingPoint[]>([]);
  
  const [selectedTripIds, setSelectedTripIds] = useState<string[]>([]);
  const [selectedColumns, setSelectedColumns] = useState<string[]>(["ticketId", "fullName", "dni", "assignedSeat"]);
  const [showInsuredOnly, setShowInsuredOnly] = useState(false);
  const [boardingSortOrder, setBoardingSortOrder] = useState<"asc" | "desc" | "custom">("asc");
  const [customBoardingOrder, setCustomBoardingOrder] = useState<BoardingPoint[]>([]);
  const [isSortModalOpen, setIsSortModalOpen] = useState(false);
  
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );


  useEffect(() => {
    if (isOpen) {
        const fetchData = async () => {
            const [toursData, reservationsData, passengersData, boardingPointsData] = await Promise.all([
                getAllFromCollection_client<Tour>('tours'),
                getAllFromCollection_client<Reservation>('reservations'),
                getAllFromCollection_client<Passenger>('passengers'),
                getAllFromCollection_client<BoardingPoint>('boarding_points'),
            ]);
            
            const now = new Date();
            // Filter for active tours only
            const activeTours = toursData.filter(tour => {
                const tourDate = (tour.date as any)?.toDate ? (tour.date as any).toDate() : new Date(tour.date);
                return tourDate >= now;
            });
            
            setTours(activeTours.map(t => ({...t, date: (t.date as any)?.toDate ? (t.date as any).toDate() : new Date(t.date)})));
            setReservations(reservationsData);
            setPassengers(passengersData);
            setBoardingPoints(boardingPointsData);
        };
        fetchData();
    }
  }, [isOpen]);

  
  const relevantBoardingPoints = useMemo(() => {
    const boardingPointIdsInSelectedTrips = new Set(
        reservations
            .filter(r => selectedTripIds.includes(r.tripId) && (r.boardingPointId || passengers.find(p => p.id === r.passengerIds[0])?.boardingPointId))
            .map(r => r.boardingPointId || passengers.find(p => p.id === r.passengerIds[0])?.boardingPointId)
            .filter((id): id is string => !!id)
    );
    return boardingPoints.filter(bp => boardingPointIdsInSelectedTrips.has(bp.id));
  }, [selectedTripIds, reservations, boardingPoints, passengers]);
  
  const handleOpenSortModal = () => {
    setCustomBoardingOrder(relevantBoardingPoints);
    setIsSortModalOpen(true);
  }

  function handleDragEnd(event: DragEndEvent) {
    const {active, over} = event;
    
    if (active.id !== over?.id) {
      setCustomBoardingOrder((items) => {
        const oldIndex = items.findIndex(item => item.id === active.id);
        const newIndex = items.findIndex(item => item.id === over?.id);
        
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  }


  const exportableData = useMemo(() => {
    const tripsToExport = tours.filter((t) => selectedTripIds.includes(t.id));
    
    return tripsToExport.map((trip) => {
      let tripReservations = reservations.filter((r) => r.tripId === trip.id);
      
      let passengerData = tripReservations
        .flatMap((res) => {
          const reservationPassengers = passengers.filter(p => (res.passengerIds || []).includes(p.id));
          const filteredPassengers = showInsuredOnly
            ? reservationPassengers.filter(p => (res.insuredPassengerIds || []).includes(p.id))
            : reservationPassengers;
          
          return filteredPassengers.map(p => ({
            passenger: p,
            reservation: res
          }));
        })
        .map(({ passenger: p, reservation: r }) => {
          const boardingPoint = boardingPoints.find(bp => bp.id === (r.boardingPointId || p.boardingPointId))?.name || "N/A";
          const dobDate = p.dob?.toDate ? p.dob.toDate() : (p.dob ? new Date(p.dob) : null);
          const dobString = dobDate ? dobDate.toLocaleDateString("es-AR") : "N/A";
          const assignedSeat = (r.assignedSeats?.length > 0) ? r.assignedSeats.map(s => s.seatId).join(', ') : "N/A";

          return {
              id: p.id,
              reservationId: r.id, // Add reservationId for unique key
              ticketId: generateDisplayID('T', r, trip, p),
              fullName: p.fullName,
              dni: p.dni,
              age: calculateAge(p.dob),
              dob: dobString,
              boardingPoint,
              boardingPointId: r.boardingPointId || p.boardingPointId,
              assignedSeat: assignedSeat,
          };
      });

      // Sorting logic
      if (boardingSortOrder === 'asc') {
          passengerData.sort((a, b) => (a.boardingPointId || '').localeCompare(b.boardingPointId || ''));
      } else if (boardingSortOrder === 'desc') {
          passengerData.sort((a, b) => (b.boardingPointId || '').localeCompare(a.boardingPointId || ''));
      } else if (boardingSortOrder === 'custom' && customBoardingOrder.length > 0) {
          const customOrderMap = new Map(customBoardingOrder.map((bp, index) => [bp.id, index]));
          passengerData.sort((a, b) => {
              const orderA = a.boardingPointId ? customOrderMap.get(a.boardingPointId) : Infinity;
              const orderB = b.boardingPointId ? customOrderMap.get(b.boardingPointId) : Infinity;
              if (orderA === undefined && orderB === undefined) return 0;
              if (orderA === undefined) return 1;
              if (orderB === undefined) return -1;
              return orderA - orderB;
          });
      }


      return { trip, passengers: passengerData };
    });
  }, [selectedTripIds, passengers, reservations, tours, showInsuredOnly, boardingPoints, boardingSortOrder, customBoardingOrder]);

  const handleCopy = (tripId: string) => {
    const tripData = exportableData.find(d => d.trip.id === tripId);
    if (!tripData) return;

    const headers = selectedColumns.map(col => dataColumns[col as keyof typeof dataColumns]).join('\t');
    const rows = tripData.passengers.map(p => {
        return selectedColumns.map(col => (p as any)[col]).join('\t');
    }).join('\n');

    navigator.clipboard.writeText(`${headers}\n${rows}`);
    toast({ title: "Copiado!", description: `Datos de ${tripData.trip.destination} copiados al portapapeles.` });
  };

  const handleExportPdf = (tripId: string) => {
    const tripData = exportableData.find(d => d.trip.id === tripId);
    if (!tripData) return;

    const doc = new jsPDF();
    const tableHeaders = selectedColumns.map(col => dataColumns[col as keyof typeof dataColumns]);
    const tableBody = tripData.passengers.map(p => selectedColumns.map(col => (p as any)[col]));
    
    (doc as any).autoTable({
        head: [tableHeaders],
        body: tableBody,
        startY: 20,
    });
    doc.text(`Pasajeros para ${tripData.trip.destination}`, 14, 15);
    doc.save(`Pasajeros_${tripData.trip.destination.replace(/ /g, "_")}.pdf`);
  };

  return (
    <>
    <Dialog open={isSortModalOpen} onOpenChange={setIsSortModalOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
            <DialogTitle>Orden Personalizado de Embarques</DialogTitle>
            <DialogDescription>
               Arrastra y suelta los puntos de embarque para establecer el orden de la lista de exportación.
            </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <ScrollArea className="h-96 pr-4">
             {customBoardingOrder.length > 0 ? (
                  <DndContext 
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handleDragEnd}
                  >
                      <SortableContext 
                          items={customBoardingOrder.map(item => item.id)}
                          strategy={verticalListSortingStrategy}
                      >
                         <div className="space-y-2">
                           {customBoardingOrder.map(bp => (
                              <SortableItem key={bp.id} id={bp.id} name={bp.name}/>
                           ))}
                         </div>
                      </SortableContext>
                  </DndContext>
              ) : (
                <div className="text-center text-muted-foreground p-8">
                  Selecciona un viaje con pasajeros para poder ordenar los puntos de embarque.
                </div>
              )}
          </ScrollArea>
        </div>
        <DialogFooter>
             <Button variant="outline" onClick={() => setIsSortModalOpen(false)}>Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Datos de Exportación</DialogTitle>
          <DialogDescription>
            Selecciona los viajes y los datos que quieres ver, copiar o exportar.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 py-4 flex-1 overflow-hidden">
          {/* Columna de Filtros */}
          <ScrollArea className="col-span-1 md:border-r pr-0 md:pr-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="font-semibold">Viajes</Label>
                <ScrollArea className="h-48 border rounded-md p-2">
                  {tours.map((tour) => (
                    <div key={tour.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`trip-${tour.id}`}
                        checked={selectedTripIds.includes(tour.id)}
                        onCheckedChange={(checked) => {
                          setSelectedTripIds((prev) =>
                            checked ? [...prev, tour.id] : prev.filter((id) => id !== tour.id)
                          );
                        }}
                      />
                      <Label htmlFor={`trip-${tour.id}`} className="font-normal">{tour.destination}</Label>
                    </div>
                  ))}
                </ScrollArea>
              </div>
               <div className="space-y-2">
                <Label className="font-semibold">Ordenar embarques por:</Label>
                 <RadioGroup value={boardingSortOrder} onValueChange={(v) => setBoardingSortOrder(v as any)}>
                    <div className="flex items-center space-x-2"><RadioGroupItem value="asc" id="sort-asc"/><Label htmlFor="sort-asc">Abecedario ascendente (ID)</Label></div>
                    <div className="flex items-center space-x-2"><RadioGroupItem value="desc" id="sort-desc"/><Label htmlFor="sort-desc">Abecedario descendente (ID)</Label></div>
                    <div className="flex items-center space-x-2"><RadioGroupItem value="custom" id="sort-custom"/><Label htmlFor="sort-custom">Personalizado</Label></div>
                 </RadioGroup>
                  {boardingSortOrder === 'custom' && (
                     <Button variant="outline" size="sm" className="w-full mt-2" onClick={handleOpenSortModal}>
                        <Settings2 className="mr-2 h-4 w-4"/>
                        Personalizar Orden
                    </Button>
                  )}
              </div>

              <div className="space-y-2">
                <Label className="font-semibold">Columnas</Label>
                <div className="space-y-2">
                  {Object.entries(dataColumns).map(([key, label]) => (
                    <div key={key} className="flex items-center space-x-2">
                      <Checkbox
                        id={`col-${key}`}
                        checked={selectedColumns.includes(key)}
                        onCheckedChange={(checked) => {
                          setSelectedColumns((prev) =>
                            checked ? [...prev, key] : prev.filter((col) => col !== key)
                          );
                        }}
                      />
                      <Label htmlFor={`col-${key}`} className="font-normal">{label}</Label>
                    </div>
                  ))}
                </div>
              </div>
              <Separator />
               <div className="flex items-center space-x-2">
                  <Checkbox
                      id="insured-only"
                      checked={showInsuredOnly}
                      onCheckedChange={(checked) => setShowInsuredOnly(!!checked)}
                  />
                  <Label htmlFor="insured-only">Mostrar solo pasajeros con seguro</Label>
              </div>
            </div>
          </ScrollArea>

          {/* Columna de Resultados */}
          <div className="col-span-1 md:col-span-3 overflow-hidden flex flex-col">
            <Label className="font-semibold mb-2">Resultados</Label>
            <ScrollArea className="flex-1">
              <div className="space-y-6 pr-2">
                {exportableData.length > 0 ? (
                  exportableData.map(({ trip, passengers: tripPassengers }) => (
                    <div key={trip.id} className="border rounded-lg">
                      <div className="bg-muted p-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                        <h3 className="font-semibold flex items-center gap-2">
                            {trip.destination} 
                            <Badge variant="secondary" className="flex items-center gap-1.5"><Users className="h-3 w-3"/>{tripPassengers.length}</Badge>
                        </h3>
                        <div className="flex gap-2 self-end sm:self-center">
                          <Button size="sm" variant="outline" onClick={() => handleCopy(trip.id)}><Copy className="mr-2 h-4 w-4" /> Copiar</Button>
                          <Button size="sm" variant="outline" onClick={() => handleExportPdf(trip.id)}><Download className="mr-2 h-4 w-4" /> PDF</Button>
                        </div>
                      </div>
                      <div className="max-h-64 w-full overflow-x-auto">
                        <Table>
                          <TableHeader className="sticky top-0 bg-background">
                            <TableRow>
                              {selectedColumns.map((col) => <TableHead key={col}>{dataColumns[col as keyof typeof dataColumns]}</TableHead>)}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {tripPassengers.map((p) => (
                              <TableRow key={`${p.id}-${p.reservationId}`}>
                                {selectedColumns.map(col => <TableCell key={col}>{(p as any)[col]}</TableCell>)}
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-muted-foreground p-8">
                    Selecciona al menos un viaje para ver los datos.
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>

        <DialogFooter className="mt-auto pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}
