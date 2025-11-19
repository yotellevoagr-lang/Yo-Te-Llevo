
"use client"

import { useState, useMemo, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import type { Tour, Reservation, Passenger, Seller, BoardingPoint, Pension, RoomType, LayoutCategory, LayoutItemType, TransportUnit, CustomLayoutConfig, PaymentMethod, Transaction } from "@/lib/types"
import { getAllFromCollection_client, getDocumentById, deleteDocument, saveReservation, saveDocument, saveTour } from "@/lib/firestore-services"
import { Loader2, History, Edit, Trash2, Calendar, User, CreditCard, DollarSign, Users, Tag, MapPin, Home, ShieldCheck, BadgePercent, Utensils, BedDouble, PercentSquare, CheckCircle, Clock, Bus, Plane, Ship } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { TripForm } from "./trip-form"
import { Badge } from "../ui/badge"
import { toTitleCase, generateDisplayID, cn } from "@/lib/utils"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { AssignTierDialog } from "./assign-tier-dialog"
import { SearchableSelect } from "../searchable-select"
import { Input } from "../ui/input"
import { Checkbox } from "../ui/checkbox"
import { Separator } from "../ui/separator"
import { SeatSelector } from "../booking/seat-selector"
import { Label } from "../ui/label"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card"


interface HistoryDashboardProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

const InfoRow = ({ label, value, icon }: { label: string, value: string | number | null | undefined, icon?: React.ReactNode}) => (
    <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
            {icon}
            <p className="text-muted-foreground font-medium">{label}</p>
        </div>
        <p className="font-semibold text-right truncate">{value || 'N/A'}</p>
    </div>
);

const calculateAge = (dob?: any): number | string => {
    if (!dob) return 'N/A';
    const birthDate = dob.toDate ? dob.toDate() : new Date(dob);
    if (isNaN(birthDate.getTime())) return 'N/A';
    
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
}

const formatDate = (date: any): string => {
    if (!date) return 'N/A';
    const d = date.toDate ? date.toDate() : new Date(date);
    if (isNaN(d.getTime())) return 'Fecha Inválida';
    return d.toLocaleDateString('es-AR');
}

const paymentMethodAbbreviations: Record<PaymentMethod, string> = {
    'Tarjeta': 'TJ',
    'Transferencia': 'TR',
    'Efectivo': 'EF'
};


type ActiveTransportUnitInfo = {
  unitNumber: number;
  category: LayoutCategory;
  type: LayoutItemType;
} | null;

type EditReservationState = {
  isOpen: boolean;
  reservation: Reservation | null;
  originalReservation: Reservation | null;
}

export function HistoryDashboard({ isOpen, onOpenChange }: HistoryDashboardProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [tours, setTours] = useState<Tour[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [passengers, setPassengers] = useState<Passenger[]>([]);
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [boardingPoints, setBoardingPoints] = useState<BoardingPoint[]>([]);
  const [pensions, setPensions] = useState<Pension[]>([]);
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [layoutConfig, setLayoutConfig] = useState<Record<LayoutCategory, Record<string, CustomLayoutConfig>> | null>(null);

  const [editingTour, setEditingTour] = useState<Tour | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [activeUnit, setActiveUnit] = useState<ActiveTransportUnitInfo>(null);
  const [editingReservation, setEditingReservation] = useState<EditReservationState>({ isOpen: false, reservation: null, originalReservation: null });
  const [assignTierState, setAssignTierState] = useState<{ isOpen: boolean, reservationId: string | null }>({ isOpen: false, reservationId: null });
  const [localInstallmentCount, setLocalInstallmentCount] = useState<string | number>('');

  const { toast } = useToast();

  const fetchData = async () => {
    setIsLoading(true);
    try {
        const [
            toursData, 
            reservationsData, 
            passengersData, 
            sellersData, 
            boardingPointsData, 
            pensionsData, 
            roomTypesData, 
            layoutConfigData
        ] = await Promise.all([
            getAllFromCollection_client<Tour>('tours'),
            getAllFromCollection_client<Reservation>('reservations'),
            getAllFromCollection_client<Passenger>('passengers'),
            getAllFromCollection_client<Seller>('sellers'),
            getAllFromCollection_client<BoardingPoint>('boarding_points'),
            getAllFromCollection_client<Pension>('pensions'),
            getAllFromCollection_client<RoomType>('room_types'),
            getDocumentById<any>('settings', 'layouts')
        ]);
        const processedTours = toursData.map(t => ({
            ...t,
            date: t.date ? new Date((t.date as any).seconds ? (t.date as any).toDate() : t.date) : new Date()
        }));
        setTours(processedTours);
        setReservations(reservationsData);
        setPassengers(passengersData);
        setSellers(sellersData);
        setBoardingPoints(boardingPointsData);
        setPensions(pensionsData);
        setRoomTypes(roomTypesData);
        if(layoutConfigData) setLayoutConfig(layoutConfigData);
    } catch (error) {
        console.error("Error fetching history data:", error);
        toast({title: "Error", description: "No se pudieron cargar los datos del historial.", variant: "destructive"});
    } finally {
        setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen]);

  const pastToursByMonth = useMemo(() => {
    const now = new Date();
    const pastTours = tours.filter(t => new Date(t.date) < now);

    return pastTours.reduce((acc, tour) => {
      const monthKey = format(new Date(tour.date), "yyyy-MM");
      if (!acc[monthKey]) {
        acc[monthKey] = [];
      }
      acc[monthKey].push(tour);
      return acc;
    }, {} as Record<string, Tour[]>);
  }, [tours]);

  const sortedMonths = useMemo(() => {
    return Object.keys(pastToursByMonth).sort().reverse();
  }, [pastToursByMonth]);
  
  const handleEditTour = (tour: Tour) => {
    setEditingTour(tour);
    setIsFormOpen(true);
  }
  
  const handleDeleteTour = async (tourId: string) => {
    if (confirm("¿Estás seguro de que quieres eliminar este viaje y todas sus reservas? Esta acción no se puede deshacer.")) {
        try {
            const reservationsToDelete = reservations.filter(r => r.tripId === tourId);
            for (const res of reservationsToDelete) {
                if (res.installments) {
                    for (const inst of res.installments.details) {
                        if (inst.isPaid && inst.transactionId) {
                            await deleteDocument('transactions', inst.transactionId);
                        }
                    }
                }
                await deleteDocument('reservations', res.id);
            }
            await deleteDocument('tours', tourId);
            toast({ title: "Viaje eliminado", description: "El viaje y sus datos asociados han sido eliminados." });
            fetchData();
        } catch (error) {
            toast({ title: "Error", description: "No se pudo eliminar el viaje.", variant: "destructive" });
        }
    }
  }
  
  const handleSaveTour = async (tourData: Tour) => {
    await saveTour(tourData, tourData.id);
    fetchData();
    setIsFormOpen(false);
    toast({ title: "Viaje Guardado", description: "El viaje ha sido actualizado." });
  }

  const formatMonthKey = (monthKey: string) => {
    const [year, month] = monthKey.split('-');
    const date = new Date(Number(year), Number(month) - 1);
    return toTitleCase(date.toLocaleString('es-ES', { month: 'long', year: 'numeric' }));
  }
  
  const getPaymentColor = (finalPrice: number, balance: number): string => {
    if (finalPrice === 0) return 'bg-gray-400';
    if (balance <= 0) return 'bg-green-500';
    if (balance < finalPrice) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const handleDialogOpen = (tour: Tour, reservation: Reservation) => {
        setEditingReservation({ isOpen: true, reservation: JSON.parse(JSON.stringify(reservation)), originalReservation: JSON.parse(JSON.stringify(reservation)) });
        const unitList = tour.transportUnits || [];
        if (unitList.length > 0) {
            const firstUnit = unitList[0];
            setActiveUnit({ unitNumber: firstUnit.id, category: firstUnit.category, type: firstUnit.type });
        } else {
            setActiveUnit(null);
        }
    };
    
    const handleUpdateReservation = async () => {
        if (!editingReservation.reservation || !editingReservation.originalReservation) return;

        try {
            const updatedReservation = { ...editingReservation.reservation };
            const originalReservation = { ...editingReservation.originalReservation };

            const newInstallments = updatedReservation.installments?.details || [];
            const originalInstallments = originalReservation.installments?.details || [];

            for (let i = 0; i < newInstallments.length; i++) {
                const newInst = newInstallments[i];
                const originalInst = originalInstallments[i];

                const wasJustPaid = newInst.isPaid && (!originalInst || !originalInst.isPaid);
                const wasJustUnpaid = !newInst.isPaid && originalInst && originalInst.isPaid;

                if (wasJustPaid) {
                    const tour = tours.find(t => t.id === updatedReservation.tripId);
                    const transaction: Omit<Transaction, 'id'> = {
                        amount: newInst.amount,
                        currency: tour?.currency || 'ARS',
                        date: new Date(),
                        description: `Pago cuota reserva ${updatedReservation.id}`,
                        type: 'income',
                        category: 'Reservation Payment',
                        relatedId: updatedReservation.id,
                        method: newInst.paymentMethod || 'Efectivo',
                    };
                    const transactionId = await saveDocument('transactions', transaction);
                    newInstallments[i].transactionId = transactionId;
                } else if (wasJustUnpaid && originalInst?.transactionId) {
                    await deleteDocument('transactions', originalInst.transactionId);
                    newInstallments[i].transactionId = undefined;
                }
            }
            
            updatedReservation.installments = {
                ...updatedReservation.installments!,
                details: newInstallments
            };
            
            const paidAmount = newInstallments.filter(inst => inst.isPaid).reduce((sum, inst) => sum + inst.amount, 0);
            const balance = updatedReservation.finalPrice - paidAmount;
            
            if (balance <= 0) {
                updatedReservation.paymentStatus = 'Pagado';
            } else if (paidAmount > 0) {
                updatedReservation.paymentStatus = 'Parcial';
            } else {
                updatedReservation.paymentStatus = 'Pendiente';
            }

            await saveReservation(updatedReservation, updatedReservation.id);
            
            await fetchData();
            setEditingReservation({isOpen: false, reservation: null, originalReservation: null });
            toast({ title: "Reserva Actualizada", description: "Los cambios han sido guardados."});
        } catch(error) {
            toast({ title: "Error", description: "No se pudieron guardar los cambios.", variant: "destructive"});
        }
    }
    
     const handleDeleteReservation = async (reservationId: string) => {
        try {
            const reservationToDelete = reservations.find(r => r.id === reservationId);
            if (reservationToDelete?.installments) {
                for (const inst of reservationToDelete.installments.details) {
                    if (inst.isPaid && inst.transactionId) {
                        await deleteDocument('transactions', inst.transactionId);
                    }
                }
            }
            await deleteDocument('reservations', reservationId);
            await fetchData();
            setEditingReservation({isOpen: false, reservation: null, originalReservation: null});
            toast({ title: "Reserva Eliminada", variant: "destructive"});
        } catch(error) {
            toast({ title: "Error", description: "No se pudo eliminar la reserva.", variant: "destructive"});
        }
    }

  return (
    <>
      <TripForm 
          isOpen={isFormOpen} 
          onOpenChange={setIsFormOpen} 
          onSave={handleSaveTour} 
          tour={editingTour} 
          boardingPoints={boardingPoints}
      />
      <Dialog open={editingReservation.isOpen} onOpenChange={(open) => setEditingReservation({ isOpen: open, reservation: open ? editingReservation.reservation : null, originalReservation: open ? editingReservation.originalReservation : null })}>
        <DialogContent onOpenAutoFocus={(e) => e.preventDefault()} className="max-w-4xl flex flex-col max-h-[90vh]">
            <DialogHeader>
                <DialogTitle>Gestionar Reserva (Historial)</DialogTitle>
                <DialogDescription>
                    Modificar detalles de la reserva para {editingReservation.reservation?.passenger} en el viaje a {tours.find(t => t.id === editingReservation.reservation?.tripId)?.destination}.
                </DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto pr-2">
            </div>
            <DialogFooter className="mt-auto pt-4 border-t">
            <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="mr-auto"><Trash2 className="mr-2 h-4 w-4" /> Eliminar Reserva</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader><AlertDialogTitle>¿Confirmas la eliminación?</AlertDialogTitle><AlertDialogDescription>Esta acción no se puede deshacer. Se eliminará permanentemente la reserva de <strong>{editingReservation.reservation?.passenger}</strong>.</AlertDialogDescription></AlertDialogHeader>
                    <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => { if (editingReservation.reservation) handleDeleteReservation(editingReservation.reservation.id); }} className="bg-destructive hover:bg-destructive/90">Eliminar</AlertDialogAction></AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            <Button variant="outline" onClick={() => setEditingReservation({ isOpen: false, reservation: null, originalReservation: null })}>Cancelar</Button>
            <Button onClick={handleUpdateReservation}>Guardar Cambios</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><History className="w-6 h-6"/> Historial de Viajes Pasados</DialogTitle>
            <DialogDescription>
              Consulta y gestiona la información de viajes que ya han finalizado.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto pr-4 -mr-6">
            {isLoading ? (
              <div className="flex justify-center items-center h-full">
                <Loader2 className="w-8 h-8 animate-spin" />
              </div>
            ) : sortedMonths.length === 0 ? (
                <p className="text-center text-muted-foreground p-8">No hay viajes en el historial.</p>
            ) : (
              <Accordion type="multiple" className="w-full space-y-4">
                {sortedMonths.map(monthKey => (
                  <AccordionItem key={monthKey} value={monthKey} className="border rounded-lg">
                    <AccordionTrigger className="p-4 text-lg font-semibold bg-muted/30 hover:no-underline">
                      {formatMonthKey(monthKey)}
                    </AccordionTrigger>
                    <AccordionContent className="p-2 md:p-4 space-y-2">
                      <Accordion type="multiple" className="w-full space-y-2">
                        {pastToursByMonth[monthKey].map(tour => (
                          <AccordionItem key={tour.id} value={tour.id} className="border rounded-md bg-background">
                            <div className="flex items-center p-1">
                                <AccordionTrigger className="p-2 text-base hover:no-underline flex-1">
                                    <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-4 text-left">
                                        <span className="font-medium">{tour.destination}</span>
                                        <span className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="w-3 h-3"/> {new Date(tour.date).toLocaleDateString()}</span>
                                    </div>
                                </AccordionTrigger>
                                <div className="flex items-center gap-1 pr-2">
                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEditTour(tour)}><Edit className="w-4 h-4"/></Button>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDeleteTour(tour.id)}><Trash2 className="w-4 h-4"/></Button>
                                </div>
                            </div>
                            <AccordionContent className="p-1 md:p-3 border-t bg-muted/20">
                                <Accordion type="multiple" className="w-full space-y-1">
                                {reservations.filter(r => r.tripId === tour.id).map(res => {
                                    const paidAmount = res.installments?.details.reduce((sum, inst) => inst.isPaid ? sum + inst.amount : sum, 0) || 0;
                                    const balance = res.finalPrice - paidAmount;
                                    const paymentColor = getPaymentColor(res.finalPrice, balance);

                                    return (
                                        <AccordionItem key={res.id} value={res.id} className="border rounded-md bg-background">
                                            <AccordionTrigger className="px-2 py-1 md:px-4 hover:no-underline text-sm">
                                                <div className="flex items-center gap-2 md:gap-4">
                                                    <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${paymentColor}`}></div>
                                                    <span className="font-semibold">{res.passenger}</span>
                                                    <Badge variant="secondary">{res.paxCount} pax</Badge>
                                                </div>
                                            </AccordionTrigger>
                                            <AccordionContent className="p-2 md:p-4 bg-secondary/20 space-y-4">
                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                                    <Card><CardHeader><CardTitle className="text-lg flex items-center gap-2"><Users className="w-5 h-5 text-primary"/>Pasajero Principal</CardTitle></CardHeader><CardContent className="space-y-3 text-sm"><InfoRow label="Nombre" value={res.passenger}/><InfoRow label="DNI" value={passengers.find(p => p.id === res.passengerIds[0])?.dni}/><InfoRow label="F. Nac." value={formatDate(passengers.find(p => p.id === res.passengerIds[0])?.dob)}/><InfoRow label="Edad" value={calculateAge(passengers.find(p => p.id === res.passengerIds[0])?.dob)}/><InfoRow label="Grupo" value={passengers.find(p => p.id === res.passengerIds[0])?.family}/></CardContent></Card>
                                                    <Card><CardHeader><CardTitle className="text-lg flex items-center gap-2"><Tag className="w-5 h-5 text-primary"/>Detalles de Reserva</CardTitle></CardHeader><CardContent className="space-y-3 text-sm"><InfoRow label="ID Reserva" value={generateDisplayID('R', res, tour, passengers.find(p => p.id === res.passengerIds[0]))} /><InfoRow label="Cantidad" value={`${res.paxCount} pasajero(s)`}/><InfoRow label="Embarque" value={boardingPoints.find(bp => bp.id === res.boardingPointId)?.name}/><InfoRow label="Ubicación" value={[(res.assignedSeats || []).map(s => s.seatId),(res.assignedCabins || []).map(c => c.cabinId)].flat().join(', ')}/><InfoRow label="Vendedor/a" value={sellers.find(s => s.id === res.sellerId)?.name} icon={<PercentSquare className="w-4 h-4 text-purple-600"/>}/></CardContent></Card>
                                                    <Card><CardHeader><CardTitle className="text-lg flex items-center gap-2"><CreditCard className="w-5 h-5 text-primary"/>Información de Pago</CardTitle></CardHeader><CardContent className="space-y-3 text-sm"><InfoRow label="Monto Total" value={`$${(res.finalPrice).toLocaleString('es-AR')}`} /><InfoRow label="Pagado" value={`$${(paidAmount).toLocaleString('es-AR')}`} /><InfoRow label="Saldo" value={`$${(balance).toLocaleString('es-AR')}`} /><Separator className="my-2" /><div className="space-y-2">{(res.installments?.details || []).map((inst, idx) => {
                                                        const paidAtRaw = inst.paidAt;
                                                        const paidAtDate = paidAtRaw instanceof Date ? paidAtRaw : paidAtRaw && (paidAtRaw as any).toDate ? (paidAtRaw as any).toDate() : null;
                                                        const isValidDate = paidAtDate instanceof Date && !isNaN(paidAtDate.getTime());
                                                        return (<div key={idx} className="flex justify-between items-center text-xs"><div className="flex items-center gap-2">{inst.isPaid ? <CheckCircle className="w-4 h-4 text-green-600"/> : <Clock className="w-4 h-4 text-muted-foreground"/>}<span>Cuota {idx + 1}</span></div><div className="flex items-center gap-1 font-mono">{inst.isPaid && inst.paymentMethod && <Badge variant="outline" className="text-[10px] p-0.5 px-1">{paymentMethodAbbreviations[inst.paymentMethod]}</Badge>}{inst.isPaid && isValidDate && <span className="text-muted-foreground">{format(paidAtDate, 'dd/MM/yy')}</span>}<span>${(inst.amount || 0).toLocaleString('es-AR')}</span></div></div>);})}</div></CardContent></Card>
                                                    <Card><CardHeader><CardTitle className="text-lg flex items-center gap-2"><Home className="w-5 h-5 text-primary"/>Detalles del Viaje</CardTitle></CardHeader><CardContent className="space-y-3 text-sm"><InfoRow label="Seguro" value={(res.insuredPassengerIds?.length || 0) > 0 ? `Sí (${res.insuredPassengerIds?.length})` : 'No'} icon={<ShieldCheck className="w-4 h-4 text-green-600"/>}/><InfoRow label="Liberados" value={(res.releasedPassengerIds?.length || 0) > 0 ? `Sí (${res.releasedPassengerIds?.length})` : 'No'} icon={<BadgePercent className="w-4 h-4 text-blue-600"/>}/><InfoRow label="Pensión" value={pensions.find(p => p.id === res.pensionId)?.name || 'No incluida'} icon={<Utensils className="w-4 h-4 text-orange-600"/>}/><InfoRow label="Tipo de Hab." value={roomTypes.find(rt => rt.id === res.roomTypeId)?.name} icon={<BedDouble className="w-4 h-4 text-blue-600"/>}/></CardContent></Card>
                                                </div>
                                                <div className="flex justify-end gap-2 mt-4">
                                                    <Button variant="outline" size="sm" onClick={() => handleDialogOpen(tour, res)}><Edit className="mr-2 h-4 w-4" /> Gestionar</Button>
                                                </div>
                                            </AccordionContent>
                                        </AccordionItem>
                                    )
                                })}
                                </Accordion>
                            </AccordionContent>
                          </AccordionItem>
                        ))}
                      </Accordion>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

    