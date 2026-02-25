
"use client"

import { useState, useMemo, useEffect } from "react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from "@/components/ui/card"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"
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
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { SearchableSelect } from "@/components/searchable-select"
import { SeatSelector } from "@/components/booking/seat-selector"
import { MoreHorizontal, CheckCircle, Clock, Trash2, Armchair, Bus, Plane, Ship, Edit, UserPlus, CreditCard, Users, Info, Calendar, MapPin, DollarSign, Home, Tag, ShieldCheck, Utensils, BedDouble, PercentSquare, Check, ChevronsUpDown, BadgePercent, Search, Star } from "lucide-react"
import type { Tour, Reservation, LayoutCategory, LayoutItemType, Seller, PaymentStatus, Passenger, BoardingPoint, Pension, RoomType, TransportUnit, PaymentMethod, Installment, Transaction, CustomLayoutConfig } from "@/lib/types"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { AddReservationForm } from "@/components/admin/add-reservation-form"
import { Checkbox } from "@/components/ui/checkbox"
import { Separator } from "@/components/ui/separator"
import { cn, generateDisplayID } from "@/lib/utils"
import { getAllFromCollection_client, saveReservation, savePassenger, deleteDocument, saveDocument, getDocumentById } from "@/lib/firestore-services"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/components/auth/auth-provider"
import { DatePicker } from "@/components/ui/date-picker"
import { format } from "date-fns"
import { AssignTierDialog } from "@/components/admin/assign-tier-dialog"
import { PassengerForm } from "@/components/admin/passenger-form"

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

type AddReservationState = {
    isOpen: boolean;
    tour: Tour | null;
}

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

const getPaymentColor = (finalPrice: number, balance: number): string => {
    if (finalPrice === 0) {
        return 'bg-gray-400';
    }
    if (balance <= 0) {
        return 'bg-green-500';
    }
    if (balance < finalPrice) {
        return 'bg-orange-500';
    }
    return 'bg-red-500';
};

const InfoRow = ({ label, value, icon }: { label: string, value: string | number | null | undefined, icon?: React.ReactNode}) => (
    <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
            {icon}
            <p className="text-muted-foreground font-medium">{label}</p>
        </div>
        <p className="font-semibold text-right truncate">{value || 'N/A'}</p>
    </div>
)

export default function ReservationsPage() {
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [allTours, setAllTours] = useState<Tour[]>([]);
  const [activeTours, setActiveTours] = useState<Tour[]>([]);
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [passengers, setPassengers] = useState<Passenger[]>([]);
  const [boardingPoints, setBoardingPoints] = useState<BoardingPoint[]>([]);
  const [pensions, setPensions] = useState<Pension[]>([]);
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [layoutConfig, setLayoutConfig] = useState<Record<LayoutCategory, Record<string, CustomLayoutConfig>> | null>(null);
  
  const [activeUnit, setActiveUnit] = useState<ActiveTransportUnitInfo>(null);
  const [editingReservation, setEditingReservation] = useState<EditReservationState>({ isOpen: false, reservation: null, originalReservation: null });
  const [addingReservation, setAddingReservation] = useState<AddReservationState>({ isOpen: false, tour: null });
  const [assignTierState, setAssignTierState] = useState<{ isOpen: boolean, reservationId: string | null }>({ isOpen: false, reservationId: null });
  const [isNewPassengerFormOpen, setIsNewPassengerFormOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();
  const { user } = useAuth();

  const [localInstallmentCount, setLocalInstallmentCount] = useState<string | number>('');

  const fetchData = async () => {
    const [
        reservationsData,
        toursData,
        sellersData,
        passengersData,
        boardingPointsData,
        pensionsData,
        roomTypesData,
        layoutConfigData
    ] = await Promise.all([
        getAllFromCollection_client<Reservation>('reservations'),
        getAllFromCollection_client<Tour>('tours'),
        getAllFromCollection_client<Seller>('sellers'),
        getAllFromCollection_client<Passenger>('passengers'),
        getAllFromCollection_client<BoardingPoint>('boarding_points'),
        getAllFromCollection_client<Pension>('pensions'),
        getAllFromCollection_client<RoomType>('room_types'),
        getDocumentById<any>('settings', 'layouts')
    ]);

    const processedTours = toursData.map(t => {
      const date = (t.date as any)?.toDate ? (t.date as any).toDate() : new Date(t.date);
      return { ...t, date };
    });

    setReservations(reservationsData);
    setAllTours(processedTours);
    setSellers(sellersData);
    setPassengers(passengersData);
    setBoardingPoints(boardingPointsData);
    setPensions(pensionsData);
    setRoomTypes(roomTypesData);
    if(layoutConfigData) setLayoutConfig(layoutConfigData);
  }

  useEffect(() => {
    fetchData();
  }, [])
  
   useEffect(() => {
    if (editingReservation.isOpen && editingReservation.reservation?.installments) {
      setLocalInstallmentCount(editingReservation.reservation.installments.count);
    }
  }, [editingReservation.isOpen, editingReservation.reservation]);
  
  useEffect(() => {
    const now = new Date();
    const filteredActiveTours = allTours.filter(tour => tour.date && new Date(tour.date) >= now);
    setActiveTours(filteredActiveTours);
  }, [allTours]);

  const employeeFamilyDnis = useMemo(() => {
    if (!user) return new Set<string>();
    const employeePassengerProfile = passengers.find(p => p.id === user.id);
    if (!employeePassengerProfile || !employeePassengerProfile.family) return new Set([employeePassengerProfile?.dni].filter(Boolean));
    
    const familyDnis = passengers
        .filter(p => p.family === employeePassengerProfile.family && p.dni)
        .map(p => p.dni);
        
    return new Set(familyDnis);
  }, [user, passengers]);


  const reservationsByTrip = useMemo(() => {
    let filteredReservations = reservations;
    if (searchTerm) {
        const lowercasedTerm = searchTerm.toLowerCase();
        filteredReservations = reservations.filter(res => {
            const tour = allTours.find(t => t.id === res.tripId);
            const mainPassenger = passengers.find(p => p.id === res.passengerIds[0]);
            
            const displayId = generateDisplayID('R', res, tour, mainPassenger).toLowerCase();

            return res.passenger.toLowerCase().includes(lowercasedTerm) ||
                   (mainPassenger && mainPassenger.dni.includes(lowercasedTerm)) ||
                   displayId.includes(lowercasedTerm);
        });
    }
    
    const getTourCapacity = (tour: Tour): number => {
        if (!tour.transportUnits || !layoutConfig) return 0;
        return tour.transportUnits.reduce((acc, unit) => {
            const config = layoutConfig[unit.category]?.[unit.type];
            return acc + (config?.capacity || 0);
        }, 0);
    }

    return activeTours.reduce((acc, tour) => {
        const tripReservations = filteredReservations.filter(res => res.tripId === tour.id);
        const occupiedCount = tripReservations.reduce((sum, r) => sum + r.paxCount, 0);
        const capacity = getTourCapacity(tour);
        const availableSeats = capacity - occupiedCount;
        
        if (tripReservations.length > 0 || (searchTerm && tour.destination.toLowerCase().includes(searchTerm.toLowerCase()))) {
            acc[tour.id] = {
                tour,
                reservations: tripReservations,
                availableSeats: availableSeats,
                occupiedCount: occupiedCount
            };
        } else if (!searchTerm) {
             acc[tour.id] = { tour, reservations: [], availableSeats: availableSeats, occupiedCount: occupiedCount };
        }
        return acc;
    }, {} as Record<string, { tour: Tour, reservations: Reservation[], availableSeats: number, occupiedCount: number }>);
  }, [reservations, activeTours, allTours, passengers, searchTerm, layoutConfig]);

  const getExpandedTransportList = (tour: Tour): TransportUnit[] => {
    return tour.transportUnits || [];
  }

  
  const handleAddReservation = async (newReservation: Reservation) => {
    try {
        await fetchData();
        window.dispatchEvent(new Event('storage'));
        toast({ title: "Reserva Creada", description: "La nueva reserva ha sido guardada."});
        setAddingReservation({ isOpen: false, tour: null });
    } catch (error) {
        toast({ title: "Error", description: "No se pudo actualizar la lista de reservas.", variant: "destructive"});
    }
  }
  
  const handlePassengerCreated = async (newPassenger: Passenger) => {
      await savePassenger(newPassenger);
      await fetchData();
  }

  const handleUpdateReservation = async () => {
    if (!editingReservation.reservation || !editingReservation.originalReservation) return;

    try {
        const updatedReservation = { ...editingReservation.reservation };
        const originalReservation = { ...editingReservation.originalReservation };

        const tour = allTours.find(t => t.id === updatedReservation.tripId);
        if (!tour) throw new Error("Viaje no encontrado");

        const reservationPassengers = passengers.filter(p => updatedReservation.passengerIds.includes(p.id));
        const calculatedPrice = reservationPassengers.reduce((total, p) => {
            const tier = tour.pricingTiers?.find(t => t.id === p.tierId);
            return total + (tier?.price ?? tour.price);
        }, 0);
        
        updatedReservation.finalPrice = calculatedPrice;

        const newInstallments = updatedReservation.installments?.details || [];
        const originalInstallments = originalReservation.installments?.details || [];

        for (let i = 0; i < newInstallments.length; i++) {
            const newInst = newInstallments[i];
            const originalInst = originalInstallments[i];

            const wasJustPaid = newInst.isPaid && (!originalInst || !originalInst.isPaid);
            const wasJustUnpaid = !newInst.isPaid && originalInst && originalInst.isPaid;

            if (wasJustPaid) {
                const tour = allTours.find(t => t.id === updatedReservation.tripId);
                const transaction: Omit<Transaction, 'id'> = {
                    amount: newInst.amount,
                    currency: tour?.currency || 'ARS',
                    date: newInst.paidAt || new Date(),
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
        window.dispatchEvent(new Event('storage'));
        setEditingReservation({isOpen: false, reservation: null, originalReservation: null });
        toast({ title: "Reserva Actualizada", description: "Los cambios han sido guardados y las transacciones actualizadas."});
    } catch(error: any) {
        console.error("Error updating reservation and transactions:", error);
        toast({ title: "Error", description: error.message || "No se pudieron guardar los cambios.", variant: "destructive"});
    }
  }

  const handleDelete = async (reservationId: string) => {
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
        window.dispatchEvent(new Event('storage'));
        setEditingReservation({isOpen: false, reservation: null, originalReservation: null});
        toast({ title: "Reserva Eliminada", variant: "destructive"});
    } catch(error: any) {
        console.error("Error deleting reservation:", error);
        toast({ title: "Error", description: error.message || "No se pudo eliminar la reserva.", variant: "destructive"});
    }
  }

  const handleAssignment = (reservationId: string, assignmentId: string, unitNumber: number, type: 'seat' | 'cabin') => {
      setEditingReservation(prev => {
        if (!prev.reservation || prev.reservation.id !== reservationId) return prev;

        let updatedRes = { ...prev.reservation };
        
        if (type === 'seat') {
            updatedRes.assignedSeats = updatedRes.assignedSeats || [];
            const isAlreadyAssigned = updatedRes.assignedSeats.some(s => s.seatId === assignmentId && s.unit === unitNumber);
            
            if (isAlreadyAssigned) {
                updatedRes.assignedSeats = updatedRes.assignedSeats.filter(s => !(s.seatId === assignmentId && s.unit === unitNumber));
            } else {
                 const totalAssignments = (updatedRes.assignedSeats.length || 0) + (updatedRes.assignedCabins?.length || 0);
                 if (totalAssignments < updatedRes.paxCount) {
                      updatedRes.assignedSeats.push({ seatId: assignmentId, unit: unitNumber });
                 }
            }
        } else if (type === 'cabin') {
             updatedRes.assignedCabins = updatedRes.assignedCabins || [];
             const isAlreadyAssigned = updatedRes.assignedCabins.some(c => c.cabinId === assignmentId && c.unit === unitNumber);

             if (isAlreadyAssigned) {
                updatedRes.assignedCabins = updatedRes.assignedCabins.filter(c => !(c.cabinId === assignmentId && c.unit === unitNumber));
             } else {
                 const totalAssignments = (updatedRes.assignedSeats?.length || 0) + (updatedRes.assignedCabins?.length || 0);
                 if (totalAssignments < updatedRes.paxCount) {
                     updatedRes.assignedCabins.push({ cabinId: assignmentId, unit: unitNumber });
                 }
             }
        }
        return { ...prev, reservation: updatedRes };
      });
  };

  const getOccupiedForTour = (tourId: string, unitNumber: number, currentReservationId: string) => {
    const occupiedSeats = reservations
      .filter(res => res.tripId === tourId && res.id !== currentReservationId)
      .flatMap(res => res.assignedSeats || [])
      .filter(seat => seat.unit === unitNumber)
      .map(seat => seat.seatId);
      
    const occupiedCabins = reservations
      .filter(res => res.tripId === tourId && res.id !== currentReservationId)
      .flatMap(res => res.assignedCabins || [])
      .filter(cabin => cabin.unit === unitNumber)
      .map(cabin => cabin.cabinId);
      
    return { occupiedSeats, occupiedCabins };
  };
  
  const getTransportIdentifier = (unit: TransportUnit) => {
    return `${unit.category}_${unit.type}_${unit.id}`;
  }

  const handleDialogOpen = (tour: Tour, reservation: Reservation) => {
    setEditingReservation({ isOpen: true, reservation: JSON.parse(JSON.stringify(reservation)), originalReservation: JSON.parse(JSON.stringify(reservation)) });
    const unitList = getExpandedTransportList(tour);
    if (unitList.length > 0) {
      const firstUnit = unitList[0];
      setActiveUnit({ unitNumber: firstUnit.id, category: firstUnit.category, type: firstUnit.type });
    } else {
      setActiveUnit(null);
    }
  };
  
  const handleInstallmentCountUpdate = () => {
    const newCount = parseInt(String(localInstallmentCount)) || 1;
    setEditingReservation(prev => {
      if (!prev.reservation) return prev;
      const installments = prev.reservation.installments || { count: 1, details: [] };
      const newDetails = Array.from({ length: newCount }, (_, i) => {
          const existing = installments.details[i];
          return existing || { amount: 0, isPaid: false };
      });
      return {
        ...prev,
        reservation: {
          ...prev.reservation,
          installments: { count: newCount, details: newDetails }
        }
      };
    });
  };

  const handlePassengerTierChange = async (passengerIds: string[], tierId: string) => {
    const batch = passengerIds.map(pId => ({
        id: pId,
        tierId: tierId
    }));
    await Promise.all(batch.map(p => savePassenger(p, p.id)));
    
    setPassengers(prev => prev.map(p => {
        if (passengerIds.includes(p.id)) {
            return { ...p, tierId };
        }
        return p;
    }));
    toast({ title: "Tarifas actualizadas." });
  }

  const handleRemovePassengerFromReservation = (passengerIdToRemove: string) => {
    setEditingReservation(prev => {
        if (!prev.reservation) return prev;
        const currentIds = prev.reservation.passengerIds;
        
        if (currentIds.length <= 1) {
            toast({ title: "Acción no permitida", description: "La reserva debe tener al menos un pasajero. Para eliminarlo, cancela la reserva completa.", variant: "destructive" });
            return prev;
        }

        const newPassengerIds = currentIds.filter(id => id !== passengerIdToRemove);
        let newPrincipalName = prev.reservation.passenger;

        if (currentIds[0] === passengerIdToRemove) {
            const newPrincipal = passengers.find(p => p.id === newPassengerIds[0]);
            newPrincipalName = newPrincipal?.fullName || 'Desconocido';
        }

        return {
            ...prev,
            reservation: { 
                ...prev.reservation, 
                passenger: newPrincipalName,
                passengerIds: newPassengerIds, 
                paxCount: newPassengerIds.length 
            }
        }
    });
  };

    const handleAddPassengerToReservation = (passengerIdToAdd: string) => {
        if (!passengerIdToAdd) return;
        setEditingReservation(prev => {
            if (!prev.reservation) return prev;
            if (prev.reservation.passengerIds.includes(passengerIdToAdd)) {
                toast({ title: "Duplicado", description: "Este pasajero ya está en la reserva.", variant: "default" });
                return prev;
            }
            const newPassengerIds = [...prev.reservation.passengerIds, passengerIdToAdd];
            return {
                ...prev,
                reservation: { ...prev.reservation, passengerIds: newPassengerIds, paxCount: newPassengerIds.length }
            };
        });
    };

    const handleNewPassengerCreatedAndAdded = async (passengerData: Passenger) => {
        try {
            const newPassengerId = await savePassenger(passengerData, passengerData.id);
            await fetchData();
            handleAddPassengerToReservation(newPassengerId);
            setIsNewPassengerFormOpen(false);
            toast({ title: "Pasajero Creado", description: `${passengerData.fullName} ha sido creado y añadido a la reserva.` });
        } catch (error) {
            toast({ title: "Error", description: "No se pudo crear el nuevo pasajero.", variant: "destructive" });
        }
    }
  
    const handleSetPrincipal = (newPrincipalId: string) => {
      setEditingReservation(prev => {
          if (!prev.reservation) return prev;
          const currentIds = prev.reservation.passengerIds;
          if (!currentIds.includes(newPrincipalId)) return prev;
  
          const newPrincipalPassenger = passengers.find(p => p.id === newPrincipalId);
          if (!newPrincipalPassenger) return prev;
  
          const newPassengerIds = [newPrincipalId, ...currentIds.filter(id => id !== newPrincipalId)];
  
          return {
              ...prev,
              reservation: {
                  ...prev.reservation,
                  passenger: newPrincipalPassenger.fullName,
                  passengerIds: newPassengerIds
              }
          };
      });
    };

  const categoryIcons: Record<LayoutCategory, React.ElementType> = {
    vehicles: Bus,
    airplanes: Plane,
    cruises: Ship,
  };

  const renderDialogContent = () => {
    if (!editingReservation.reservation) return null;
    
    const reservation = editingReservation.reservation;
    const tour = allTours.find(t => t.id === reservation.tripId);
    
    if (!tour) return null;

    const installments = reservation.installments || { count: 1, details: [{ amount: reservation.finalPrice, isPaid: false }] };
    const paidAmount = installments.details.reduce((sum, inst) => inst.isPaid ? sum + inst.amount : sum, 0);
    
    const reservationPassengers = reservation.passengerIds.map(id => passengers.find(p => p.id === id)).filter((p): p is Passenger => !!p);
    
    const calculatedPrice = reservationPassengers.reduce((total, p) => {
        const tier = tour.pricingTiers?.find(t => t.id === p.tierId);
        return total + (tier?.price ?? tour.price);
    }, 0);
    const balance = calculatedPrice - paidAmount;

    const unitList = getExpandedTransportList(tour);

    const sellerOptions = sellers.map(s => ({
        value: s.id,
        label: s.name,
        keywords: [s.dni]
    }));
    
    const availablePassengersForAdding = passengers.filter(p => 
        !reservation.passengerIds.includes(p.id) && 
        !reservations.some(r => r.tripId === tour.id && r.id !== reservation.id && r.passengerIds.includes(p.id))
    );

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Users className="w-5 h-5"/> Pasajeros en la Reserva</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="space-y-2">
                        {reservationPassengers.map((p, index) => (
                            <div key={p.id} className="flex items-center justify-between p-2 bg-secondary/50 rounded-md">
                                <div className="flex items-center gap-2">
                                    {index === 0 ? (
                                        <Star className="w-4 h-4 text-amber-500 fill-amber-400" />
                                    ) : (
                                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleSetPrincipal(p.id)} title="Hacer principal">
                                            <Star className="w-4 h-4 text-muted-foreground hover:text-amber-500"/>
                                        </Button>
                                    )}
                                    <p className="font-medium text-sm">
                                        {p.fullName} <span className="text-xs text-muted-foreground">({p.dni})</span>
                                    </p>
                                </div>
                                <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => handleRemovePassengerFromReservation(p.id)}>
                                    <Trash2 className="w-4 h-4"/>
                                </Button>
                            </div>
                        ))}
                    </div>
                    <Separator />
                    <div className="space-y-2">
                        <Label>Añadir Pasajero a la Reserva</Label>
                        <SearchableSelect
                            options={availablePassengersForAdding.map(p => ({ value: p.id, label: `${p.fullName} (${p.dni})`, keywords: [p.dni]}))}
                            value={""}
                            onChange={handleAddPassengerToReservation}
                            placeholder="Buscar pasajero existente..."
                        />
                    </div>
                    <Button variant="outline" size="sm" className="w-full" onClick={() => setIsNewPassengerFormOpen(true)}>
                        <UserPlus className="mr-2 h-4 w-4"/> Crear y Añadir Nuevo Pasajero
                    </Button>
                </CardContent>
            </Card>
           <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Tag className="w-5 h-5"/> Datos de Venta</CardTitle></CardHeader>
            <CardContent className="space-y-2">
               <div className="space-y-2">
                <Label htmlFor="seller">Vendedor/a Asignado</Label>
                <SearchableSelect
                    options={sellerOptions}
                    value={reservation.sellerId}
                    onChange={(sellerId) => setEditingReservation(prev => ({ ...prev, reservation: { ...prev.reservation!, sellerId: sellerId } }))}
                    placeholder="Buscar y seleccionar vendedor..."
                />
               </div>
                <div className="space-y-2 pt-4">
                    <Label htmlFor="boardingPoint">Punto de Embarque de la Reserva</Label>
                    <Select
                        value={reservation.boardingPointId || 'default'}
                        onValueChange={(value) =>
                            setEditingReservation((prev) => ({
                            ...prev,
                            reservation: {
                                ...prev.reservation!,
                                boardingPointId: value === 'default' ? undefined : value,
                            },
                            }))
                        }
                        >
                        <SelectTrigger id="boardingPoint">
                            <SelectValue placeholder="Embarque del pasajero" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="default">
                                Usar el predeterminado del pasajero
                            </SelectItem>
                            {boardingPoints.map((bp) => (
                                <SelectItem key={bp.id} value={bp.id}>
                                    {bp.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">Anula el punto de embarque por defecto del pasajero solo para este viaje.</p>
                </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><CreditCard className="w-5 h-5"/> Datos de Pago</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="totalPrice">Precio Final (calculado: ${calculatedPrice.toLocaleString('es-AR')})</Label>
                <Input
                  id="totalPrice"
                  type="number"
                  value={reservation.finalPrice || ''}
                  onChange={(e) => setEditingReservation(prev => ({...prev, reservation: {...prev.reservation!, finalPrice: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0}}))}
                />
              </div>
               <div className="space-y-2">
                <Label htmlFor="installments-count">Cantidad de Cuotas</Label>
                <Input
                  id="installments-count"
                  type="number"
                  min="1"
                  value={localInstallmentCount}
                  onChange={(e) => setLocalInstallmentCount(e.target.value)}
                  onBlur={handleInstallmentCountUpdate}
                  onKeyDown={(e) => e.key === 'Enter' && handleInstallmentCountUpdate()}
                />
              </div>
              <div className="space-y-3">
                  <Label>Detalle de Cuotas</Label>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                    {installments.details.map((inst, index) => (
                       <div key={index} className="space-y-2">
                           <div className={cn(
                            "flex items-center gap-2 p-2 rounded-md border",
                            inst.isPaid && "bg-green-100 border-green-200"
                           )}>
                              <Label className="w-20">Cuota {index + 1}</Label>
                              <Input 
                                type="number" 
                                value={inst.amount || ''} 
                                onChange={(e) => {
                                  const newDetails = [...installments.details];
                                  newDetails[index].amount = e.target.value === '' ? 0 : parseFloat(e.target.value) || 0;
                                  setEditingReservation(prev => ({...prev, reservation: {...prev.reservation!, installments: { ...installments, details: newDetails }}}));
                                }}
                              />
                              <Checkbox checked={inst.isPaid} onCheckedChange={(checked) => {
                                 const newDetails = [...installments.details];
                                 newDetails[index].isPaid = !!checked;
                                 if (checked && !newDetails[index].paidAt) {
                                     newDetails[index].paidAt = new Date();
                                 } else if (!checked) {
                                     // User requested not to clear dates
                                 }
                                 setEditingReservation(prev => ({...prev, reservation: {...prev.reservation!, installments: { ...installments, details: newDetails }}}))
                              }}/>
                              <Label>Pagada</Label>
                           </div>
                            {inst.isPaid && (
                                <div className="pl-8 flex gap-4 items-center">
                                    <Select 
                                        value={inst.paymentMethod} 
                                        onValueChange={(method: PaymentMethod) => {
                                            const newDetails = [...installments.details];
                                            newDetails[index].paymentMethod = method;
                                            setEditingReservation(prev => ({...prev, reservation: {...prev.reservation!, installments: { ...installments, details: newDetails }}}))
                                        }}
                                    >
                                        <SelectTrigger className="h-8">
                                            <SelectValue placeholder="Método de pago..."/>
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Tarjeta">Tarjeta</SelectItem>
                                            <SelectItem value="Transferencia">Transferencia</SelectItem>
                                            <SelectItem value="Efectivo">Efectivo</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <DatePicker
                                        date={inst.paidAt ? (inst.paidAt instanceof Date ? inst.paidAt : (inst.paidAt as any).toDate ? (inst.paidAt as any).toDate() : new Date(inst.paidAt as any)) : undefined}
                                        setDate={(d) => {
                                            const newDetails = [...installments.details];
                                            newDetails[index].paidAt = d;
                                            setEditingReservation(prev => ({...prev, reservation: {...prev.reservation!, installments: { ...installments, details: newDetails }}}))
                                        }}
                                        className="h-8"
                                    />
                                </div>
                            )}
                       </div>
                    ))}
                  </div>
              </div>
              <div className="flex justify-between font-semibold p-2 bg-muted rounded-md">
                 <span>Saldo Pendiente:</span>
                 <span>${balance.toLocaleString('es-AR')}</span>
              </div>
            </CardContent>
          </Card>
           <Card>
              <CardHeader><CardTitle>Servicios Adicionales</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                 <div className="space-y-2">
                    <Label htmlFor="pensionId">Tipo de Pensión</Label>
                    <Select
                        value={reservation.pensionId}
                        onValueChange={(val) => setEditingReservation(prev => ({...prev, reservation: {...prev.reservation!, pensionId: val}}))}
                    >
                        <SelectTrigger id="pensionId"><SelectValue placeholder="Seleccionar pensión..."/></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">Sin Pensión Asignada</SelectItem>
                            {pensions.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="roomTypeId">Tipo de Habitación</Label>
                     <Select
                        value={reservation.roomTypeId}
                        onValueChange={(val) => setEditingReservation(prev => ({...prev, reservation: {...prev.reservation!, roomTypeId: val}}))}
                    >
                        <SelectTrigger id="roomTypeId"><SelectValue placeholder="Seleccionar habitación..."/></SelectTrigger>
                        <SelectContent>
                             <SelectItem value="none">Sin Habitación Asignada</SelectItem>
                            {roomTypes.map(rt => <SelectItem key={rt.id} value={rt.id}>{rt.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                 <div className="space-y-3 pt-2">
                    <Label>Seguro Médico por Pasajero</Label>
                    <div className="space-y-2 p-2 border rounded-md max-h-40 overflow-y-auto">
                        {reservationPassengers.map(p => (
                            <div key={p.id} className="flex items-center space-x-2">
                                <Checkbox
                                    id={`insure-${p.id}`}
                                    checked={(reservation.insuredPassengerIds || []).includes(p.id)}
                                    onCheckedChange={(checked) => {
                                        setEditingReservation(prev => {
                                            const currentInsured = prev.reservation?.insuredPassengerIds || [];
                                            const newInsured = checked 
                                                ? [...currentInsured, p.id]
                                                : currentInsured.filter(id => id !== p.id);
                                            return {...prev, reservation: {...prev.reservation!, insuredPassengerIds: newInsured}}
                                        });
                                    }}
                                />
                                <Label htmlFor={`insure-${p.id}`} className="font-normal">{p.fullName}</Label>
                            </div>
                        ))}
                    </div>
                </div>
              </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Asignación de Lugares</CardTitle>
              <CardDescription>Reserva para {reservation.paxCount} pasajeros.</CardDescription>
               {activeUnit && unitList.length > 1 && (
                 <div className="flex items-center gap-2 pt-2">
                      <Bus className="w-5 h-5 text-muted-foreground"/>
                      <Select
                          value={activeUnit ? getTransportIdentifier(unitList.find(b => b.id === activeUnit.unitNumber)!) : ''}
                          onValueChange={(val) => {
                              const selectedUnit = unitList.find(b => getTransportIdentifier(b) === val);
                              if (selectedUnit) {
                                  setActiveUnit({ unitNumber: selectedUnit.id, category: selectedUnit.category, type: selectedUnit.type });
                              }
                          }}
                      >
                          <SelectTrigger className="w-[280px]">
                              <SelectValue placeholder="Seleccionar unidad" />
                          </SelectTrigger>
                          <SelectContent>
                              {unitList.map(unit => {
                                  const Icon = categoryIcons[unit.category];
                                  return (
                                      <SelectItem key={unit.id} value={getTransportIdentifier(unit)}>
                                          <div className="flex items-center gap-2">
                                              <Icon className="w-4 h-4 text-muted-foreground"/>
                                              <span>{unit.type} (Unidad {unit.id})</span>
                                          </div>
                                      </SelectItem>
                                  )
                              })}
                          </SelectContent>
                      </Select>
                  </div>
               )}
            </CardHeader>
            <CardContent>
              {activeUnit && (
                <SeatSelector
                    category={activeUnit.category}
                    layoutType={activeUnit.type}
                    occupiedSeats={getOccupiedForTour(reservation.tripId, activeUnit.unitNumber, reservation.id).occupiedSeats}
                    occupiedCabins={getOccupiedForTour(reservation.tripId, activeUnit.unitNumber, reservation.id).occupiedCabins}
                    selectedSeats={(editingReservation.reservation?.assignedSeats || []).filter(s => s.unit === activeUnit.unitNumber).map(s => String(s.seatId))}
                    selectedCabins={(editingReservation.reservation?.assignedCabins || []).filter(c => c.unit === activeUnit.unitNumber).map(c => String(c.cabinId))}
                    onAssignment={(id, type) => handleAssignment(reservation!.id, id, activeUnit.unitNumber, type as 'seat'|'cabin')}
                    maxAssignments={reservation.paxCount}
                />
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  };


  return (
    <>
    {addingReservation.tour && (
        <AddReservationForm 
            isOpen={addingReservation.isOpen}
            onOpenChange={(open) => setAddingReservation({ isOpen: open, tour: open ? addingReservation.tour : null })}
            onSave={handleAddReservation}
            tour={addingReservation.tour}
            passengers={passengers}
            allReservations={reservations}
            onPassengerCreated={handlePassengerCreated}
            sellers={sellers}
            boardingPoints={boardingPoints}
            roomTypes={roomTypes}
        />
    )}

    <AssignTierDialog 
        isOpen={assignTierState.isOpen}
        onOpenChange={(open) => setAssignTierState({isOpen: open, reservationId: open ? assignTierState.reservationId : null})}
        reservation={reservations.find(r => r.id === assignTierState.reservationId) || null}
        tour={allTours.find(t => t.id === reservations.find(r => r.id === assignTierState.reservationId)?.tripId) || null}
        passengers={passengers}
        onPassengerTierChange={handlePassengerTierChange}
    />
    
    <PassengerForm
        isOpen={isNewPassengerFormOpen}
        onOpenChange={setIsNewPassengerFormOpen}
        onSave={handleNewPassengerCreatedAndAdded}
        passenger={null}
        allPassengers={passengers}
        boardingPoints={boardingPoints}
    />

    <Dialog open={editingReservation.isOpen} onOpenChange={(open) => setEditingReservation({ isOpen: open, reservation: open ? editingReservation.reservation : null, originalReservation: open ? editingReservation.originalReservation : null })}>
      <DialogContent onOpenAutoFocus={(e) => e.preventDefault()} className="max-w-4xl flex flex-col max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Gestionar Reserva</DialogTitle>
          <DialogDescription>
            Modificar detalles de la reserva para {editingReservation.reservation?.passenger} en el viaje a {allTours.find(t => t.id === editingReservation.reservation?.tripId)?.destination}.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto pr-2">
          {renderDialogContent()}
        </div>
        <DialogFooter className="mt-auto pt-4 border-t">
          <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button variant="destructive" className="mr-auto">
                    <Trash2 className="mr-2 h-4 w-4" /> Eliminar Reserva
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                <AlertDialogTitle>¿Confirmas la eliminación?</AlertDialogTitle>
                <AlertDialogDescription>
                    Esta acción no se puede deshacer. Se eliminará permanentemente la reserva de <strong>{editingReservation.reservation?.passenger}</strong>.
                </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={() => { if (editingReservation.reservation) handleDelete(editingReservation.reservation.id); }} className="bg-destructive hover:bg-destructive/90">Eliminar</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
          <Button onClick={handleUpdateReservation}>Guardar Cambios</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>


    <div className="space-y-6">
       <div>
        <h2 className="text-2xl font-bold">Gestión de Reservas</h2>
        <p className="text-muted-foreground">
          Visualiza las reservas, asigna asientos y gestiona los estados.
        </p>
      </div>
      <Card>
        <CardHeader>
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input 
                    placeholder="Buscar por pasajero, DNI o ID de reserva..."
                    className="pl-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
        </CardHeader>
        <CardContent className="pt-0">
           {Object.keys(reservationsByTrip).length === 0 ? (
                <div className="h-24 text-center flex items-center justify-center">
                    No se encontraron reservas con los criterios de búsqueda.
                </div>
            ) : (
                <Accordion type="multiple" className="w-full space-y-4">
                    {Object.values(reservationsByTrip).map(({ tour, reservations: tripReservations, availableSeats, occupiedCount }) => {
                       return (
                       <AccordionItem value={tour.id} key={tour.id} className="border-b-0">
                           <AccordionTrigger className="text-lg font-medium hover:no-underline bg-muted/50 px-4 rounded-t-lg">
                               <div className="flex justify-between items-center w-full">
                                  <span>{tour.destination} ({tripReservations.length} reservas)</span>
                                  <div className="flex items-center gap-2 mr-4">
                                      <Badge variant="secondary">Ocup: {occupiedCount}</Badge>
                                      <Badge variant={availableSeats > 5 ? "default" : "destructive"}>Disp: {availableSeats}</Badge>
                                  </div>
                               </div>
                            </AccordionTrigger>
                           <AccordionContent className="p-0">
                                <div className="flex justify-end p-4 border-x border-b rounded-b-lg">
                                    <Button onClick={() => setAddingReservation({isOpen: true, tour: tour})}>
                                        <UserPlus className="mr-2 h-4 w-4"/>
                                        Agregar Reserva
                                    </Button>
                                </div>
                               {tripReservations.length > 0 ? (
                                <div className="space-y-2 mt-4">
                                {tripReservations.map((res, index) => {
                                    const reservationPassengers = passengers.filter(p => res.passengerIds.includes(p.id));
                                    const calculatedPrice = reservationPassengers.reduce((total, p) => {
                                        const tier = tour.pricingTiers?.find(t => t.id === p.tierId);
                                        return total + (tier?.price ?? tour.price);
                                    }, 0);
                                    
                                    const paidAmount = res.installments?.details.reduce((sum, inst) => inst.isPaid ? sum + inst.amount : sum, 0) || 0;
                                    const balance = calculatedPrice - paidAmount;
                                    const paymentColor = getPaymentColor(calculatedPrice, balance);
                                    
                                    const mainResPassenger = passengers.find(p => p.id === res.passengerIds?.[0]);
                                    const reservationBoardingPoint = boardingPoints.find(bp => bp.id === res.boardingPointId);
                                    const passengerBoardingPoint = mainResPassenger ? boardingPoints.find(bp => bp.id === mainResPassenger.boardingPointId) : undefined;
                                    const boardingPointName = reservationBoardingPoint?.name || passengerBoardingPoint?.name;
                                    
                                    const isSelfOrFamily = mainResPassenger?.dni && employeeFamilyDnis.has(mainResPassenger.dni);
                                    const canEdit = !isSelfOrFamily;
                                    
                                    return (
                                        <Accordion key={`${res.id}-${index}`} type="single" collapsible>
                                            <AccordionItem value={res.id} className="border rounded-lg">
                                                <AccordionTrigger className="px-4 hover:no-underline text-base">
                                                    <div className="flex items-center gap-4">
                                                        <div className={cn("w-3 h-3 rounded-full shrink-0", paymentColor)}></div>
                                                        <span>{res.passenger}</span>
                                                        <Badge variant={res.status === 'Confirmado' ? 'secondary' : 'outline'}>{res.status}</Badge>
                                                    </div>
                                                </AccordionTrigger>
                                                <AccordionContent className="p-4 bg-secondary/20 space-y-4">
                                                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                                        <Card><CardHeader><CardTitle className="text-lg flex items-center gap-2"><Users className="w-5 h-5 text-primary"/>Pasajero Principal</CardTitle></CardHeader><CardContent className="space-y-3 text-sm"><InfoRow label="Nombre" value={res.passenger}/><InfoRow label="DNI" value={passengers.find(p => p.id === res.passengerIds[0])?.dni}/><InfoRow label="F. Nac." value={formatDate(passengers.find(p => p.id === res.passengerIds[0])?.dob)}/><InfoRow label="Edad" value={calculateAge(passengers.find(p => p.id === res.passengerIds[0])?.dob)}/><InfoRow label="Grupo" value={passengers.find(p => p.id === res.passengerIds[0])?.family}/></CardContent></Card>
                                                        <Card><CardHeader><CardTitle className="text-lg flex items-center gap-2"><Tag className="w-5 h-5 text-primary"/>Detalles de Reserva</CardTitle></CardHeader><CardContent className="space-y-3 text-sm"><InfoRow label="ID Reserva" value={generateDisplayID('R', res, tour, passengers.find(p => p.id === res.passengerIds[0]))} /><InfoRow label="Cantidad" value={`${res.paxCount} pasajero(s)`}/><InfoRow label="Embarque" value={boardingPointName}/><InfoRow label="Ubicación" value={[(res.assignedSeats || []).map(s => s.seatId),(res.assignedCabins || []).map(c => c.cabinId)].flat().join(', ')}/><InfoRow label="Vendedor/a" value={sellers.find(s => s.id === res.sellerId)?.name} icon={<PercentSquare className="w-4 h-4 text-purple-600"/>}/></CardContent></Card>
                                                        <Card><CardHeader><CardTitle className="text-lg flex items-center gap-2"><CreditCard className="w-5 h-5 text-primary"/>Información de Pago</CardTitle></CardHeader><CardContent className="space-y-3 text-sm"><InfoRow label="Monto Total" value={`$${(calculatedPrice).toLocaleString('es-AR')}`} /><InfoRow label="Pagado" value={`$${(paidAmount).toLocaleString('es-AR')}`} /><InfoRow label="Saldo" value={`$${(balance).toLocaleString('es-AR')}`} /><Separator className="my-2" /><div className="space-y-2">{(res.installments?.details || []).map((inst, idx) => {
                                                        const paidAtRaw = inst.paidAt;
                                                        const paidAtDate = paidAtRaw instanceof Date ? paidAtRaw : (paidAtRaw && (paidAtRaw as any).toDate ? (paidAtRaw as any).toDate() : (paidAtRaw ? new Date(paidAtRaw) : null));
                                                        const isValidDate = paidAtDate instanceof Date && !isNaN(paidAtDate.getTime());
                                                        return (<div key={idx} className="flex justify-between items-center text-xs"><div className="flex items-center gap-2">{inst.isPaid ? <CheckCircle className="w-4 h-4 text-green-600"/> : <Clock className="w-4 h-4 text-muted-foreground"/>}<span>Cuota {idx + 1}</span></div><div className="flex flex-col items-end gap-0.5"><div className="flex items-center gap-1 font-mono">{inst.isPaid && inst.paymentMethod && <Badge variant="outline" className="text-[10px] p-0.5 px-1">{paymentMethodAbbreviations[inst.paymentMethod]}</Badge>}<span>${(inst.amount || 0).toLocaleString('es-AR')}</span></div>{isValidDate && <span className="text-[10px] text-muted-foreground flex items-center gap-1"><Calendar className="w-3 h-3"/>{format(paidAtDate, 'dd/MM/yy')}</span>}</div></div>);})}</div></CardContent></Card>
                                                         <Card><CardHeader><CardTitle className="text-lg flex items-center gap-2"><Home className="w-5 h-5 text-primary"/>Detalles del Viaje</CardTitle></CardHeader><CardContent className="space-y-3 text-sm"><InfoRow label="Seguro" value={(res.insuredPassengerIds?.length || 0) > 0 ? `Sí (${res.insuredPassengerIds?.length})` : 'No'} icon={<ShieldCheck className="w-4 h-4 text-green-600"/>}/><InfoRow label="Liberados" value={(res.releasedPassengerIds?.length || 0) > 0 ? `Sí (${res.releasedPassengerIds?.length})` : 'No'} icon={<BadgePercent className="w-4 h-4 text-blue-600"/>}/><InfoRow label="Pensión" value={pensions.find(p => p.id === res.pensionId)?.name || 'No incluida'} icon={<Utensils className="w-4 h-4 text-orange-600"/>}/><InfoRow label="Tipo de Hab." value={roomTypes.find(rt => rt.id === res.roomTypeId)?.name} icon={<BedDouble className="w-4 h-4 text-blue-600"/>}/></CardContent></Card>
                                                    </div>
                                                     <div className="flex justify-end gap-2 mt-4">
                                                        {canEdit ? (
                                                            <>
                                                                <Button variant="outline" size="sm" onClick={() => setAssignTierState({ isOpen: true, reservationId: res.id })}>
                                                                    <BadgePercent className="mr-2 h-4 w-4" /> Asignar Tarifas
                                                                </Button>
                                                                <Button variant="outline" size="sm" onClick={() => handleDialogOpen(tour, res)}>
                                                                    <Edit className="mr-2 h-4 w-4" /> Gestionar
                                                                </Button>
                                                            </>
                                                        ) : (
                                                            <div className="text-xs text-muted-foreground p-2 text-right">No puedes editar esta reserva porque te pertenece a ti o a un familiar.</div>
                                                        )}
                                                     </div>
                                                </AccordionContent>
                                            </AccordionItem>
                                        </Accordion>
                                    )
                                })}
                                </div>
                               ) : (
                                <div className="text-center text-muted-foreground py-8">
                                    No hay reservas para este viaje aún.
                                </div>
                               )}
                           </AccordionContent>
                       </AccordionItem>
                       )
                    })}
                </Accordion>
            )}
        </CardContent>
      </Card>
    </div>
    </>
  )
}
    

    






    