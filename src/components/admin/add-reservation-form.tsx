
"use client"

import { useEffect, useState, useMemo, useCallback } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import type { Passenger, Seller, Reservation, PaymentStatus, Tour, BoardingPoint, RoomType, CreatorContext } from "@/lib/types"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"
import { SearchableSelect } from "@/components/searchable-select"
import { UserPlus, XCircle, Trash2 } from "lucide-react"
import { Checkbox } from "../ui/checkbox"
import { ScrollArea } from "../ui/scroll-area"
import { DatePicker } from "../ui/date-picker"
import { savePassenger, saveReservation, isDniUnique } from "@/lib/firestore-services"
import { useAuth } from "@/components/auth/auth-provider"
import { cn } from "@/lib/utils"
import { Card } from "@/components/ui/card"

interface AddReservationFormProps {
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
  onSave: (reservation: Reservation) => void
  tour: Tour
  passengers: Passenger[]
  allReservations: Reservation[]
  onPassengerCreated: (newPassenger: Passenger) => void
  sellers: Seller[]
  boardingPoints: BoardingPoint[]
  roomTypes: RoomType[]
}

type BookingPassenger = Partial<Omit<Passenger, 'id'>> & {
    tempId: string;
    isNew: boolean;
    existingId?: string;
};

const createNewBookingPassenger = (): BookingPassenger => ({
    tempId: `new-${Date.now()}-${Math.random()}`,
    isNew: true,
    fullName: "",
    dni: "",
    dob: null,
    phone: "",
    family: "",
    nationality: "Argentina",
    tierId: "adult",
});


export function AddReservationForm({ 
    isOpen, onOpenChange, onSave, tour, passengers, allReservations, 
    onPassengerCreated, sellers, boardingPoints, roomTypes 
}: AddReservationFormProps) {
    const [bookingPassengers, setBookingPassengers] = useState<BookingPassenger[]>([createNewBookingPassenger()]);
    const [reservationDetails, setReservationDetails] = useState({
        sellerId: undefined as string | undefined,
        paymentStatus: "Pendiente" as PaymentStatus,
        boardingPointId: undefined as string | undefined,
        roomTypeId: undefined as string | undefined,
        finalPrice: tour.price,
    });
    
    const { toast } = useToast();
    const { user, userRole } = useAuth();

    useEffect(() => {
        if (isOpen) {
            setBookingPassengers([createNewBookingPassenger()]);
            setReservationDetails({
                sellerId: undefined,
                paymentStatus: "Pendiente",
                boardingPointId: undefined,
                roomTypeId: undefined,
                finalPrice: tour.price,
            });
        }
    }, [isOpen, tour.price]);
    
    useEffect(() => {
        const total = bookingPassengers.reduce((acc, passenger) => {
            const tier = tour.pricingTiers?.find(t => t.id === passenger.tierId);
            return acc + (tier?.price ?? tour.price);
        }, 0);
        setReservationDetails(prev => ({...prev, finalPrice: total}));
    }, [bookingPassengers, tour]);


    const availablePassengersForSearch = useMemo(() => {
        const bookedPassengerIdsForThisTour = new Set(
          allReservations
            .filter(r => r.tripId === tour.id)
            .flatMap(r => r.passengerIds || [])
        );
        const alreadyInBookingListIds = new Set(
            bookingPassengers.filter(p => p.existingId).map(p => p.existingId)
        );
        
        return passengers.filter(p => !bookedPassengerIdsForThisTour.has(p.id) && !alreadyInBookingListIds.has(p.id));
    }, [passengers, allReservations, tour.id, bookingPassengers]);

    const sellerOptions = useMemo(() => {
        return sellers.map(s => ({
          value: s.id,
          label: s.name,
          keywords: [s.dni]
        }));
    }, [sellers]);

    const handlePassengerDataChange = (tempId: string, field: keyof BookingPassenger, value: any) => {
        setBookingPassengers(prev => prev.map(p => {
            if (p.tempId === tempId) {
                return { ...p, [field]: value };
            }
            return p;
        }));
    }
    
    const handleSelectExistingPassenger = (tempId: string, passengerId: string) => {
         const passenger = passengers.find(p => p.id === passengerId);
         if (!passenger) return;
         
         const dobFromDb = passenger.dob as any;
         let dobDate: Date | null = null;
         if (dobFromDb) {
             dobDate = dobFromDb.toDate ? dobFromDb.toDate() : new Date(dobFromDb);
         }

         setBookingPassengers(prev => prev.map(p => {
            if (p.tempId === tempId) {
                return {
                    ...p,
                    ...passenger,
                    dob: dobDate,
                    isNew: false,
                    existingId: passenger.id,
                };
            }
            return p;
         }));
    }

    const addPassengerSlot = () => {
        setBookingPassengers(prev => [...prev, createNewBookingPassenger()]);
    }
    
    const removePassengerSlot = (tempId: string) => {
        setBookingPassengers(prev => prev.filter(p => p.tempId !== tempId));
    }
    
    const handleSubmitReservation = async () => {
        if (bookingPassengers.length === 0 || !bookingPassengers[0]?.fullName || !bookingPassengers[0]?.dni) {
            toast({ title: "Faltan datos", description: "El primer pasajero debe tener nombre y DNI completos.", variant: "destructive" });
            return;
        }

        const creator: CreatorContext = {
            by: user!.id,
            role: userRole as 'admin' | 'employee',
        };
        
        const passengerIds: string[] = [];
        
        for (const bp of bookingPassengers) {
            if (!bp.fullName || !bp.dni) {
                 toast({ title: "Datos incompletos", description: `Faltan datos para el pasajero "${bp.fullName || 'desconocido'}".`, variant: "destructive" });
                return;
            }

            if (bp.isNew) {
                const isUnique = await isDniUnique(bp.dni);
                if (!isUnique) {
                     toast({ title: "DNI ya registrado", description: `El DNI ${bp.dni} ya está asociado a una cuenta. Búscalo en la lista.`, variant: "destructive" });
                     return;
                }
                const newId = await savePassenger({ ...bp, family: bp.family || `Familia ${bp.fullName.split(' ').pop()}`.trim() });
                passengerIds.push(newId);
                onPassengerCreated({ ...bp, id: newId } as Passenger);
            } else if (bp.existingId) {
                passengerIds.push(bp.existingId);
            }
        }
        
        const mainPassengerName = bookingPassengers[0].fullName!;

        const reservationToSave: Omit<Reservation, 'id'> = {
            tripId: tour.id,
            passenger: mainPassengerName,
            passengerIds: passengerIds,
            paxCount: bookingPassengers.length,
            assignedSeats: [],
            assignedCabins: [],
            status: 'Pendiente',
            paymentStatus: reservationDetails.paymentStatus,
            sellerId: reservationDetails.sellerId || 'unassigned',
            finalPrice: reservationDetails.finalPrice,
            boardingPointId: reservationDetails.boardingPointId,
            roomTypeId: reservationDetails.roomTypeId,
            createdBy: creator
        }

        const newId = await saveReservation(reservationToSave);
        onSave({ id: newId, ...reservationToSave});
    }

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-3xl flex flex-col h-[90vh]">
                <DialogHeader>
                    <DialogTitle>Agregar Reserva a {tour.destination}</DialogTitle>
                    <DialogDescription>
                        Busca o crea los pasajeros y completa los detalles de la reserva.
                    </DialogDescription>
                </DialogHeader>

                <ScrollArea className="flex-grow pr-6 -mr-6 mt-4 border-t pt-4">
                   <div className="space-y-4">
                     {bookingPassengers.map((pax, index) => (
                        <Card key={pax.tempId} className="p-4 relative">
                            <Label className="font-semibold text-base mb-2 block">{index === 0 ? 'Pasajero Principal' : `Acompañante ${index}`}</Label>
                            {index > 0 && (
                                <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-7 w-7 text-destructive" onClick={() => removePassengerSlot(pax.tempId)}>
                                    <Trash2 className="w-4 h-4"/>
                                </Button>
                            )}
                            <div className="grid grid-cols-2 gap-4">
                               <SearchableSelect
                                  options={availablePassengersForSearch.map(p => ({ value: p.id, label: `${p.fullName} (${p.dni})`, keywords: [p.dni]}))}
                                  value={pax.existingId || ''}
                                  onChange={(val) => handleSelectExistingPassenger(pax.tempId, val)}
                                  placeholder="Buscar pasajero existente..."
                                  className="col-span-2"
                               />
                                <div className="space-y-1">
                                    <Label>Nombre Completo</Label>
                                    <Input value={pax.fullName || ''} onChange={e => handlePassengerDataChange(pax.tempId, 'fullName', e.target.value)} disabled={!pax.isNew} />
                                </div>
                                 <div className="space-y-1">
                                    <Label>DNI</Label>
                                    <Input value={pax.dni || ''} onChange={e => handlePassengerDataChange(pax.tempId, 'dni', e.target.value)} disabled={!pax.isNew}/>
                                </div>
                                <div className="space-y-1">
                                    <Label>Fecha de Nacimiento</Label>
                                    <DatePicker date={pax.dob ? new Date(pax.dob) : undefined} setDate={d => handlePassengerDataChange(pax.tempId, 'dob', d)} disabled={!pax.isNew} />
                                </div>
                                <div className="space-y-1">
                                    <Label>Teléfono</Label>
                                    <Input value={pax.phone || ''} onChange={e => handlePassengerDataChange(pax.tempId, 'phone', e.target.value)} disabled={!pax.isNew}/>
                                </div>
                            </div>
                        </Card>
                     ))}
                     <Button variant="outline" size="sm" onClick={addPassengerSlot}><UserPlus className="w-4 h-4 mr-2"/>Añadir Pasajero</Button>
                   </div>
                   
                   <div className="space-y-4 pt-6 mt-6 border-t">
                      <div className="grid grid-cols-2 gap-4">
                         <div className="space-y-2">
                            <Label htmlFor="paxCount">Cantidad de Pasajeros</Label>
                            <Input id="paxCount" type="number" value={bookingPassengers.length} disabled />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="finalPrice">Precio Final (Total)</Label>
                            <Input id="finalPrice" type="number" value={reservationDetails.finalPrice} onChange={(e) => setReservationDetails(prev => ({...prev, finalPrice: parseFloat(e.target.value) || 0}))} />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="seller">Vendedor/a</Label>
                            <SearchableSelect options={sellerOptions} value={reservationDetails.sellerId || ''} onChange={(value) => setReservationDetails(prev => ({...prev, sellerId: value}))} placeholder="Buscar vendedor..." listHeight="h-32"/>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="paymentStatus">Estado de Pago</Label>
                            <Select value={reservationDetails.paymentStatus} onValueChange={(val: PaymentStatus) => setReservationDetails(prev => ({...prev, paymentStatus: val}))}>
                                <SelectTrigger id="paymentStatus"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Pendiente">Pendiente</SelectItem>
                                    <SelectItem value="Parcial">Parcial</SelectItem>
                                    <SelectItem value="Pagado">Pagado</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="roomTypeId">Tipo de Habitación</Label>
                        <Select value={reservationDetails.roomTypeId} onValueChange={(val) => setReservationDetails(prev => ({...prev, roomTypeId: val}))}>
                            <SelectTrigger id="roomTypeId"><SelectValue placeholder="Seleccionar habitación..."/></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">Sin habitación</SelectItem>
                                {roomTypes.map(rt => <SelectItem key={rt.id} value={rt.id}>{rt.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="boardingPointId">Punto de Embarque</Label>
                        <Select value={reservationDetails.boardingPointId} onValueChange={(val) => setReservationDetails(prev => ({...prev, boardingPointId: val}))}>
                            <SelectTrigger id="boardingPointId"><SelectValue placeholder="Seleccionar embarque..."/></SelectTrigger>
                            <SelectContent>
                                {boardingPoints.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                   </div>
                </ScrollArea>
                
                <DialogFooter className="mt-auto pt-4 border-t shrink-0">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
                    <Button onClick={handleSubmitReservation} disabled={bookingPassengers.length === 0}>Guardar Reserva</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
