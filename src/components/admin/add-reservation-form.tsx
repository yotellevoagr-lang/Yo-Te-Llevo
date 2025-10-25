

"use client"

import { useEffect, useState, useMemo } from "react"
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
import type { Passenger, Seller, Reservation, PaymentStatus, Tour, BoardingPoint, RoomType } from "@/lib/types"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { SearchableSelect } from "@/components/searchable-select"
import { UserPlus, XCircle } from "lucide-react"
import { Checkbox } from "../ui/checkbox"
import { ScrollArea } from "../ui/scroll-area"
import { DatePicker } from "../ui/date-picker"
import { savePassenger, saveReservation } from "@/lib/firestore-services"

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

const defaultReservationState = {
    mainPassengerId: "",
    paxCount: 1,
    sellerId: "unassigned",
    paymentStatus: "Pendiente" as PaymentStatus,
    selectedPassengerIds: [] as string[],
    boardingPointId: undefined as string | undefined,
    roomTypeId: undefined as string | undefined,
    finalPrice: 0,
}

const newPassengerDefaultState = {
    fullName: "",
    dni: "",
    dob: undefined as Date | undefined | null,
    phone: "",
    family: "",
    boardingPointId: undefined as string | undefined,
}

export function AddReservationForm({ 
    isOpen, onOpenChange, onSave, tour, passengers, allReservations, 
    onPassengerCreated, sellers, boardingPoints, roomTypes 
}: AddReservationFormProps) {
  const [reservationData, setReservationData] = useState(defaultReservationState);
  const [newPassengerData, setNewPassengerData] = useState(newPassengerDefaultState);
  
  const [isCreatingPassenger, setIsCreatingPassenger] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearchListOpen, setIsSearchListOpen] = useState(false);
  
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
        setReservationData({
            ...defaultReservationState,
            finalPrice: tour.price // Default to base price
        });
        setNewPassengerData(newPassengerDefaultState);
        setSearchTerm("");
        setIsCreatingPassenger(false);
        setIsSearchListOpen(false);
    }
  }, [isOpen, tour])

  const availablePassengers = useMemo(() => {
    const bookedPassengerIdsForThisTour = new Set(
      allReservations
        .filter(r => r.tripId === tour.id)
        .flatMap(r => r.passengerIds || [])
    );
    return passengers.filter(p => !bookedPassengerIdsForThisTour.has(p.id));
  }, [passengers, allReservations, tour.id]);


  const searchResults = useMemo(() => {
    if (!searchTerm) return availablePassengers; // Show all when search is empty
    const lowercasedTerm = searchTerm.toLowerCase();
    return availablePassengers.filter(p => 
        p.fullName.toLowerCase().includes(lowercasedTerm) || 
        p.dni.includes(lowercasedTerm)
    );
  }, [searchTerm, availablePassengers]);

  const sellerOptions = useMemo(() => {
    return sellers.map(s => ({
      value: s.id,
      label: s.name,
      keywords: [s.dni]
    }));
  }, [sellers]);

  const selectedMainPassenger = useMemo(() => {
    return passengers.find(p => p.id === reservationData.mainPassengerId);
  }, [reservationData.mainPassengerId, passengers]);
  
  const familyMembers = useMemo(() => {
    if (!selectedMainPassenger?.family) return [];
    const bookedPassengerIdsForThisTour = new Set(
      allReservations
        .filter(r => r.tripId === tour.id)
        .flatMap(r => r.passengerIds || [])
    );
    return passengers.filter(p => p.family === selectedMainPassenger.family && !bookedPassengerIdsForThisTour.has(p.id));
  }, [selectedMainPassenger, passengers, allReservations, tour.id]);


  const handleReservationDataChange = (id: keyof typeof reservationData, value: any) => {
    setReservationData(prev => ({ ...prev, [id]: value }));
  }
  
  const handleNewPassengerDataChange = (id: keyof typeof newPassengerData, value: any) => {
    setNewPassengerData(prev => ({...prev, [id]: value}));
  }

  const handleSelectSearchedPassenger = (passenger: Passenger) => {
    setReservationData(prev => ({
        ...prev,
        mainPassengerId: passenger.id,
        selectedPassengerIds: [passenger.id],
        paxCount: 1,
        boardingPointId: passenger.boardingPointId,
    }));
    setSearchTerm(passenger.fullName);
    setIsSearchListOpen(false);
  }

  const handleTriggerNewPassengerForm = () => {
    const isDNI = /^\d+$/.test(searchTerm);
    setNewPassengerData(prev => ({
        ...prev,
        fullName: isDNI ? "" : searchTerm,
        dni: isDNI ? searchTerm : ""
    }));
    setIsCreatingPassenger(true);
    setIsSearchListOpen(false);
  }

  const handleSaveNewPassenger = async () => {
    if (!newPassengerData.fullName || !newPassengerData.dni) {
      toast({ title: "Faltan datos", description: "Por favor, completa el nombre completo y el DNI.", variant: "destructive" });
      return;
    }
    
    const newId = await savePassenger({
        nationality: 'Argentina',
        tierId: 'adult',
        ...newPassengerData,
    });
    
    const newPassengerToSelect = {
        id: newId,
        nationality: 'Argentina',
        tierId: 'adult',
        ...newPassengerData,
        dob: newPassengerData.dob || null
    }

    onPassengerCreated(newPassengerToSelect);
    await handleSelectSearchedPassenger(newPassengerToSelect);

    setIsCreatingPassenger(false);
    setNewPassengerData(newPassengerDefaultState);
    toast({ title: "Pasajero creado", description: `${newPassengerToSelect.fullName} ha sido añadido/a.`});
  }

  const handleMemberSelect = (passengerId: string, checked: boolean) => {
     setReservationData(prev => {
        const currentSelection = prev.selectedPassengerIds;
        let newSelection;
        if (checked) {
            newSelection = [...currentSelection, passengerId];
        } else {
            newSelection = currentSelection.filter(id => id !== passengerId);
        }
        return { ...prev, selectedPassengerIds: newSelection, paxCount: newSelection.length };
     });
  }
  
  const handleSubmitReservation = async () => {
    if (!selectedMainPassenger) {
        toast({ title: "Faltan datos", description: "Por favor, selecciona un pasajero principal.", variant: "destructive" });
        return;
    }
    if(reservationData.selectedPassengerIds.length !== reservationData.paxCount) {
        toast({ title: "Verificar pasajeros", description: "La cantidad de pasajeros seleccionados no coincide con la cantidad de pasajeros de la reserva.", variant: "destructive" });
        return;
    }
    
    const reservationToSave: Omit<Reservation, 'id'> = {
        tripId: tour.id,
        passenger: selectedMainPassenger.fullName,
        passengerIds: reservationData.selectedPassengerIds,
        paxCount: reservationData.selectedPassengerIds.length,
        assignedSeats: [],
        assignedCabins: [],
        status: 'Pendiente',
        paymentStatus: reservationData.paymentStatus,
        sellerId: reservationData.sellerId,
        finalPrice: reservationData.finalPrice,
        boardingPointId: reservationData.boardingPointId,
        roomTypeId: reservationData.roomTypeId,
    }

    const newId = await saveReservation(reservationToSave);
    onSave({ id: newId, ...reservationToSave});
  }

  const canSubmit = reservationData.paxCount === reservationData.selectedPassengerIds.length && reservationData.mainPassengerId;
  
  const handleClearSearch = () => {
    setSearchTerm("");
    setReservationData(prev => ({...prev, mainPassengerId: "", selectedPassengerIds: [], paxCount: 1}));
    setIsCreatingPassenger(false);
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl flex flex-col h-[90vh]">
        <DialogHeader>
          <DialogTitle>Agregar Reserva a {tour.destination}</DialogTitle>
          <DialogDescription>
            Busca un pasajero principal o créalo. Luego completa los detalles de la reserva.
          </DialogDescription>
        </DialogHeader>
        
        {/* --- SECTION 1: SEARCH PASSENGER --- */}
        <div className="space-y-2 relative">
            <Label htmlFor="passenger-search">Pasajero Principal</Label>
            <div className="relative">
              <Input
                  id="passenger-search"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  onFocus={() => setIsSearchListOpen(true)}
                  onBlur={() => setTimeout(() => setIsSearchListOpen(false), 200)}
                  placeholder="Buscar por nombre o DNI..."
                  disabled={!!selectedMainPassenger}
                  autoComplete="off"
              />
              {selectedMainPassenger && (
                  <Button variant="ghost" size="icon" className="absolute top-1/2 -translate-y-1/2 right-1" onClick={handleClearSearch}>
                      <XCircle className="w-5 h-5 text-muted-foreground"/>
                  </Button>
              )}
            </div>

            {isSearchListOpen && !selectedMainPassenger && (
                <div className="absolute z-50 w-full bg-background border rounded-md shadow-lg mt-1">
                     <ScrollArea className="h-48">
                        {searchResults.length > 0 ? (
                           searchResults.map(p => (
                                <div key={p.id} className="p-2 hover:bg-accent cursor-pointer" onClick={() => handleSelectSearchedPassenger(p)}>
                                    {p.fullName} ({p.dni})
                                </div>
                            ))
                        ) : (
                           <div className="text-center p-4">
                                <p className="text-sm text-muted-foreground mb-2">No se encontró al pasajero.</p>
                                <Button onClick={handleTriggerNewPassengerForm}>
                                    <UserPlus className="mr-2 h-4 w-4"/>
                                    Registrar "{searchTerm}"
                                </Button>
                            </div>
                        )}
                     </ScrollArea>
                </div>
            )}
        </div>
        
        <ScrollArea className="flex-grow pr-6 -mr-6 mt-4 border-t pt-4">
            {/* --- SECTION 2: ADD NEW PASSENGER --- */}
            {isCreatingPassenger && !selectedMainPassenger && (
                <div className="p-4 border rounded-lg bg-muted/50 space-y-4 mb-4">
                    <h3 className="font-semibold">Datos del Nuevo Pasajero</h3>
                    <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="new-fullName">Nombre Completo</Label>
                        <Input id="new-fullName" value={newPassengerData.fullName} onChange={(e) => handleNewPassengerDataChange('fullName', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="new-dni">DNI</Label>
                        <Input id="new-dni" value={newPassengerData.dni} onChange={(e) => handleNewPassengerDataChange('dni', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="new-dob">Fecha de Nacimiento</Label>
                        <DatePicker id="new-dob" date={newPassengerData.dob ? new Date(newPassengerData.dob) : undefined} setDate={(d) => handleNewPassengerDataChange('dob', d)} captionLayout="dropdown-buttons" fromYear={1920} toYear={new Date().getFullYear()} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="new-phone">Teléfono</Label>
                        <Input id="new-phone" value={newPassengerData.phone} onChange={(e) => handleNewPassengerDataChange('phone', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="new-family">Grupo Familiar (Opcional)</Label>
                        <Input id="new-family" value={newPassengerData.family} onChange={(e) => handleNewPassengerDataChange('family', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="new-boardingPointId">Punto de Embarque</Label>
                        <Select value={newPassengerData.boardingPointId} onValueChange={(val) => handleNewPassengerDataChange('boardingPointId', val)}>
                        <SelectTrigger id="new-boardingPointId"><SelectValue placeholder="Seleccionar..."/></SelectTrigger>
                        <SelectContent>
                            {boardingPoints.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                        </SelectContent>
                        </Select>
                    </div>
                    </div>
                    <div className="flex justify-end">
                    <Button onClick={handleSaveNewPassenger}>Guardar y Seleccionar Pasajero</Button>
                    </div>
                </div>
            )}
            
            {/* --- SECTION 3: RESERVATION DETAILS --- */}
            {selectedMainPassenger && (
                <div className="space-y-4 pt-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="paxCount">Cantidad de Pasajeros</Label>
                            <Input id="paxCount" type="number" min="1" value={reservationData.paxCount} onChange={(e) => handleReservationDataChange('paxCount', parseInt(e.target.value) || 1)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="finalPrice">Precio Final (Total)</Label>
                            <Input id="finalPrice" type="number" value={reservationData.finalPrice} onChange={(e) => handleReservationDataChange('finalPrice', parseFloat(e.target.value) || 0)} />
                        </div>
                    </div>
                    
                    {familyMembers.length > 0 && (
                        <div className="p-4 border rounded-md space-y-3">
                            <Label>Seleccionar Integrantes ({reservationData.selectedPassengerIds.length}/{reservationData.paxCount})</Label>
                            <ScrollArea className="h-40"><div className="space-y-2 pr-2">
                                {familyMembers.map(member => (
                                    <div key={member.id} className="flex items-center space-x-2 p-2 rounded-md hover:bg-muted">
                                        <Checkbox
                                            id={`member-${member.id}`}
                                            checked={reservationData.selectedPassengerIds.includes(member.id)}
                                            onCheckedChange={(checked) => handleMemberSelect(member.id, !!checked)}
                                            disabled={member.id === selectedMainPassenger.id}
                                        />
                                        <Label htmlFor={`member-${member.id}`} className="font-normal flex-1 cursor-pointer">
                                            {member.fullName} <span className="text-muted-foreground"> (DNI: {member.dni})</span>
                                        </Label>
                                    </div>
                                ))}
                            </div></ScrollArea>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="seller">Vendedor/a</Label>
                            <SearchableSelect
                                options={sellerOptions}
                                value={reservationData.sellerId}
                                onChange={(value) => handleReservationDataChange('sellerId', value)}
                                placeholder="Buscar vendedor..."
                                listHeight="h-32"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="paymentStatus">Estado de Pago</Label>
                            <Select value={reservationData.paymentStatus} onValueChange={(val: PaymentStatus) => handleReservationDataChange('paymentStatus', val)}>
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
                        <Select value={reservationData.roomTypeId} onValueChange={(val) => handleReservationDataChange('roomTypeId', val)}>
                            <SelectTrigger id="roomTypeId"><SelectValue placeholder="Seleccionar habitación..."/></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">Sin habitación</SelectItem>
                                {roomTypes.map(rt => <SelectItem key={rt.id} value={rt.id}>{rt.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="boardingPointId">Punto de Embarque</Label>
                        <Select value={reservationData.boardingPointId} onValueChange={(val) => handleReservationDataChange('boardingPointId', val)}>
                            <SelectTrigger id="boardingPointId"><SelectValue placeholder="Seleccionar embarque..."/></SelectTrigger>
                            <SelectContent>
                                {boardingPoints.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            )}
        </ScrollArea>
        
        <DialogFooter className="mt-auto pt-4 border-t shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmitReservation} disabled={!canSubmit}>Guardar Reserva</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
