

"use client"

import { useState, useEffect, useMemo } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import Image from "next/image"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { getTourById, savePassenger, saveReservation, getAllFromCollection } from "@/lib/firestore-services"
import type { Tour, Reservation, Passenger, Seller, PricingTier } from "@/lib/types"
import { DatePicker } from "@/components/ui/date-picker"
import { ArrowLeft, CalendarIcon, ClockIcon, MapPinIcon, PlusIcon, TicketIcon, UsersIcon, HeartIcon, ArrowRight, PercentSquare, ShieldCheck, Trash2 } from "lucide-react"
import Link from "next/link"
import { Checkbox } from "@/components/ui/checkbox"

type BookingPassenger = Omit<Passenger, 'fullName' | 'dob'> & { firstName: string; lastName: string; dob?: Date | null; };

const adultTier: PricingTier = { id: 'adult', name: 'Adulto', price: 0 };

const calculateAge = (dob?: Date | string | null) => {
    if (!dob) return Infinity;
    const birthDate = typeof dob === 'string' ? new Date(dob) : new Date(String(dob));
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
}

const generateNextReservationId = (tourDate: Date, passengerId: string): { id: string; counter: number } => {
    const year = new Date(tourDate).getFullYear().toString().slice(-2);
    const key = `ytl_reservation_counter_${year}`;
    const currentCount = parseInt(localStorage.getItem(key) || '0');
    const nextCount = currentCount + 1;
    localStorage.setItem(key, String(nextCount));
    const counterString = String(nextCount).padStart(3, '0');
    return {
        id: `R-${year}-${counterString}-${passengerId.slice(-4)}`,
        counter: nextCount
    };
}


export default function BookingPage() {
  const { id } = useParams()
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast()

  const [tour, setTour] = useState<Tour | null>(null)
  const [allPassengers, setAllPassengers] = useState<Passenger[]>([])
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [sellers, setSellers] = useState<Seller[]>([])
  
  // For non-logged-in users
  const [bookingPassengers, setBookingPassengers] = useState<BookingPassenger[]>([])
  const [insuredGuestIds, setInsuredGuestIds] = useState<string[]>([]);


  // For logged-in users
  const [loggedInPassenger, setLoggedInPassenger] = useState<Passenger | null>(null);
  const [familyMembers, setFamilyMembers] = useState<Passenger[]>([]);
  const [selectedPassengerIds, setSelectedPassengerIds] = useState<string[]>([]);
  const [insuredMemberIds, setInsuredMemberIds] = useState<string[]>([]);

  const [paxCount, setPaxCount] = useState(1);


  const [isClient, setIsClient] = useState(false)
  const [loggedInSellerId, setLoggedInSellerId] = useState<string | null>(null)
  
  useEffect(() => {
    setIsClient(true);
    const sellerIdFromStorage = localStorage.getItem("ytl_employee_id");
    if (sellerIdFromStorage) setLoggedInSellerId(sellerIdFromStorage);

    const fetchData = async () => {
        const tourDataRaw = await getTourById(id as string);
        if (tourDataRaw) {
          const date = (tourDataRaw.date as any)?.toDate ? (tourDataRaw.date as any).toDate() : new Date(tourDataRaw.date);
          const tourData = { ...tourDataRaw, date };
          if (new Date(tourData.date) >= new Date()) {
            setTour(tourData);
          }
        }

        const [passengersData, reservationsData, sellersData] = await Promise.all([
            getAllFromCollection<Passenger>('passengers'),
            getAllFromCollection<Reservation>('reservations'),
            getAllFromCollection<Seller>('sellers'),
        ]);
        
        setAllPassengers(passengersData);
        setReservations(reservationsData);
        setSellers(sellersData);
        
        const passengerIdFromStorage = localStorage.getItem("ytl_user_id");
        if (passengerIdFromStorage) {
            const user = passengersData.find(p => p.id === passengerIdFromStorage);
            if (user) {
                setLoggedInPassenger(user);
                const family = passengersData.filter(p => p.family === user.family);
                setFamilyMembers(family);
                setSelectedPassengerIds([user.id]); // Select user by default
                setPaxCount(1);
            }
        } else {
             const newGuestId = `P-GUEST-${Date.now()}`;
             setBookingPassengers([{
                id: newGuestId, firstName: "", lastName: "", dni: "",
                dob: null, phone: "", family: "", nationality: "Argentina", tierId: 'adult'
            }]);
        }
    };

    fetchData();

    const handleStorageChange = () => fetchData();
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [id])

  // --- Logic for non-logged-in users ---
  const addPassenger = () => {
    setBookingPassengers(prev => [...prev, {
        id: `P-GUEST-${Date.now()}`, firstName: "", lastName: "", dni: "",
        dob: null, phone: "", family: "", nationality: "Argentina", tierId: 'adult'
    }]);
  }
  const removePassenger = (passengerId: string) => {
    setBookingPassengers(prev => prev.filter(p => p.id !== passengerId));
    setInsuredGuestIds(prev => prev.filter(id => id !== passengerId));
  }
  const handlePassengerChange = (passengerId: string, field: keyof BookingPassenger, value: any) => {
    setBookingPassengers(prev => prev.map(p => 
        p.id === passengerId ? { ...p, [field]: value } : p
    ));
  }
  const handleGuestInsurance = (passengerId: string, checked: boolean) => {
    setInsuredGuestIds(prev => checked ? [...prev, passengerId] : prev.filter(id => id !== passengerId));
  }

  // --- Logic for logged-in users ---
  const handleMemberSelect = (passengerId: string, checked: boolean) => {
     setSelectedPassengerIds(prev => {
        const currentSelection = prev;
        let newSelection;
        if (checked) {
            newSelection = [...currentSelection, passengerId];
        } else {
            newSelection = currentSelection.filter(id => id !== passengerId);
            setInsuredMemberIds(current => current.filter(id => id !== passengerId)); // Also un-insure
        }
        setPaxCount(newSelection.length);
        return newSelection;
     });
  }
  
  const handleMemberInsurance = (passengerId: string, checked: boolean) => {
    setInsuredMemberIds(prev => checked ? [...prev, passengerId] : prev.filter(id => id !== passengerId));
  }


  const handleConfirmReservation = async () => {
    let mainPassenger: Passenger | null = null;
    let newPassengerList: Passenger[] = [];
    let paxTotal = 0;
    let insuredIds: string[] = [];
    const passengersToSave: Passenger[] = [];

    if (loggedInPassenger) { // Logged-in flow
        if (selectedPassengerIds.length === 0) {
            toast({ title: "Faltan datos", description: "Por favor, selecciona al menos un pasajero.", variant: "destructive" });
            return;
        }
        mainPassenger = loggedInPassenger;
        newPassengerList = allPassengers.filter(p => selectedPassengerIds.includes(p.id));
        paxTotal = newPassengerList.length;
        insuredIds = insuredMemberIds;

    } else { // Guest flow
        const firstGuest = bookingPassengers[0];
        if (!firstGuest?.firstName || !firstGuest?.lastName || !firstGuest?.dni || !firstGuest?.phone) {
            toast({ title: "Faltan datos", description: "Por favor, complete nombre, apellido, DNI y teléfono del pasajero principal.", variant: "destructive" });
            return;
        }
        
        const familyName = `Familia ${firstGuest.lastName}`;
        
        newPassengerList = bookingPassengers.map(bp => {
            const passengerDob = bp.dob ? new Date(bp.dob) : null;
            let finalPassenger: Passenger = { ...bp, fullName: `${bp.firstName} ${bp.lastName}`.trim(), family: familyName, dob: passengerDob };
            const existingPassenger = allPassengers.find(p => p.dni === bp.dni);
            
            if (existingPassenger) {
                finalPassenger = { ...existingPassenger, ...finalPassenger, id: existingPassenger.id };
            } else {
                finalPassenger.id = `P-GUEST-${bp.dni}-${Date.now()}`;
            }
            passengersToSave.push(finalPassenger);
            return finalPassenger;
        });

        mainPassenger = newPassengerList[0];
        paxTotal = newPassengerList.length;
        insuredIds = insuredGuestIds;
    }
    
    // Batch save new/updated passengers
    for (const p of passengersToSave) {
        await savePassenger(p);
    }
    window.dispatchEvent(new Event('storage'));

    let sellerToAssign = loggedInSellerId || 'unassigned';

    // If it's a client making the reservation, assign a random seller
    if (!loggedInSellerId) {
        const availableSellers = sellers.filter(s => s.dni !== '99999999'); // Exclude admin
        if (availableSellers.length > 0) {
            const randomSeller = availableSellers[Math.floor(Math.random() * availableSellers.length)];
            sellerToAssign = randomSeller.id;
        }
    }
    
    if (!mainPassenger?.id) {
        toast({ title: "Error Interno", description: "No se pudo asignar un ID al pasajero principal.", variant: "destructive" });
        return;
    }
    
    const { id: reservationId, counter } = generateNextReservationId(new Date(tour!.date), mainPassenger.id);

    const newReservation: Reservation = {
        id: reservationId,
        tripId: tour!.id,
        passenger: mainPassenger.fullName,
        passengerIds: newPassengerList.map(p => p.id),
        insuredPassengerIds: insuredIds,
        paxCount: paxTotal,
        assignedSeats: [],
        assignedCabins: [],
        status: "Pendiente",
        paymentStatus: "Pendiente",
        sellerId: sellerToAssign,
        finalPrice: totalPrice
    };

    await saveReservation(newReservation);
    window.dispatchEvent(new Event('storage'));


    toast({ title: "¡Solicitud Enviada!", description: `Tu reserva para ${tour?.destination} ha sido recibida.`, duration: 3000 });

    const confirmationData = { reservation: newReservation, tour: tour, seller: sellers.find(s => s.id === sellerToAssign), mainPassenger };
    sessionStorage.setItem('ytl_last_reservation', JSON.stringify(confirmationData));
    
    router.push('/booking/confirmation');
  }
  
  const totalPassengers = loggedInPassenger ? selectedPassengerIds.length : bookingPassengers.length;
  const availableTiers = tour ? [adultTier, ...(tour.pricingTiers || [])] : [adultTier];

  const childTier = tour?.pricingTiers?.find(t => t.name.toLowerCase().includes('niño') || t.name.toLowerCase().includes('menor'));

  const tourBasePrice = useMemo(() => {
    if (!tour) return 0;
    
    let currentPassengers: Partial<Passenger>[] = [];
    if(loggedInPassenger) {
        currentPassengers = allPassengers.filter(p => selectedPassengerIds.includes(p.id));
    } else {
        currentPassengers = bookingPassengers;
    }

    return currentPassengers.reduce((total, p) => {
        const age = calculateAge(p.dob);
        let tierPrice = tour.price;
        if (childTier && age < 12) { // Assuming "child" is under 12
            tierPrice = childTier.price;
        }
        return total + tierPrice;
    }, 0);
  }, [tour, loggedInPassenger, selectedPassengerIds, bookingPassengers, allPassengers, childTier]);

  const insuranceCost = useMemo(() => {
    if (!tour?.insurance?.active) return 0;
    const insuredCount = loggedInPassenger ? insuredMemberIds.length : insuredGuestIds.length;
    return insuredCount * tour.insurance.cost;
  }, [tour, loggedInPassenger, insuredMemberIds, insuredGuestIds]);

  const totalPrice = tourBasePrice + insuranceCost;
  const currencySymbol = tour?.currency === 'USD' ? 'U$S' : '$';

  
  if (!isClient) return null;

  if (!tour) {
    return (
      <div className="flex flex-col min-h-screen">
        <SiteHeader />
        <main className="flex-1 flex items-center justify-center text-center p-8">
            <Card className="max-w-lg">
                <CardHeader><CardTitle>Viaje no disponible</CardTitle><CardDescription>Lo sentimos, el viaje que buscas ya no está disponible o la fecha ha expirado.</CardDescription></CardHeader>
                <CardContent><Button asChild><a href="/tours">Ver otros viajes</a></Button></CardContent>
            </Card>
        </main>
        <SiteFooter />
      </div>
    )
  }
  
  return (
    <div className="flex flex-col min-h-screen bg-muted/20">
      <SiteHeader />
      <main className="flex-1 py-12">
        <div className="container">
          <Button variant="ghost" onClick={() => router.back()} className="mb-8">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a los viajes
          </Button>
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-8">
              <Card className="overflow-hidden shadow-lg">
                <div className="relative h-48 sm:h-64">
                   <Image 
                    src={tour.backgroundImage || "https://placehold.co/800x400.png"} 
                    alt={tour.destination} 
                    layout="fill" 
                    objectFit="cover" 
                    className="brightness-90" 
                    data-ai-hint="travel destination"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent p-6 flex flex-col justify-end">
                      <h1 className="text-3xl sm:text-4xl font-headline text-white drop-shadow-xl">{tour.destination}</h1>
                  </div>
                </div>
                <CardContent className="p-6 bg-card">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-muted-foreground">
                      <div className="flex items-center gap-2"><MapPinIcon className="w-5 h-5 text-primary" /><span>Salida desde Buenos Aires</span></div>
                      <div className="flex items-center gap-2"><CalendarIcon className="w-5 h-5 text-primary" /><span>{new Date(tour.date).toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span></div>
                      <div className="flex items-center gap-2"><ClockIcon className="w-5 h-5 text-primary" /><span>{new Date(tour.date).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} hs</span></div>
                  </div>
                </CardContent>
              </Card>

              { loggedInPassenger ? (
                // LOGGED-IN USER VIEW
                <Card className="shadow-lg">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-3 text-2xl"><UsersIcon className="w-8 h-8 text-primary"/> ¿Quiénes viajan?</CardTitle>
                       <CardDescription>Selecciona los integrantes de tu familia que irán a este viaje.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="p-4 border rounded-md space-y-3">
                            <div className="flex justify-between items-center">
                                <Label>Integrantes del Grupo</Label>
                                <Button variant="outline" size="sm"><PlusIcon className="mr-2 h-4 w-4" /> Añadir Nuevo</Button>
                            </div>
                            <div className="max-h-60 overflow-y-auto space-y-2 pr-2">
                                {familyMembers.map(member => {
                                    const age = calculateAge(member.dob);
                                    const canHaveInsurance = tour.insurance && tour.insurance.active && age >= tour.insurance.minAge && age <= tour.insurance.maxAge;
                                    const isSelected = selectedPassengerIds.includes(member.id);

                                    return (
                                        <div key={member.id} className="flex flex-col space-y-2 p-2 rounded-md hover:bg-muted">
                                            <div className="flex items-center space-x-2">
                                                <Checkbox
                                                    id={`member-${member.id}`}
                                                    checked={isSelected}
                                                    onCheckedChange={(checked) => handleMemberSelect(member.id, !!checked)}
                                                />
                                                <Label htmlFor={`member-${member.id}`} className="font-normal flex-1 cursor-pointer">
                                                    {member.fullName} <span className="text-muted-foreground">(DNI: {member.dni})</span>
                                                </Label>
                                            </div>
                                            {isSelected && tour.insurance?.active && (
                                                <div className="pl-6">
                                                   <div className="flex items-center space-x-2">
                                                        <Checkbox 
                                                            id={`insurance-member-${member.id}`}
                                                            checked={insuredMemberIds.includes(member.id)}
                                                            onCheckedChange={(checked) => handleMemberInsurance(member.id, !!checked)}
                                                            disabled={!canHaveInsurance}
                                                        />
                                                        <Label htmlFor={`insurance-member-${member.id}`} className="font-normal flex-1 cursor-pointer">
                                                           Añadir seguro (${tour.insurance.cost.toLocaleString('es-AR')})
                                                           {!canHaveInsurance && <span className="text-xs text-muted-foreground ml-2">(Fuera de rango de edad)</span>}
                                                        </Label>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </CardContent>
                </Card>
              ) : (
                // GUEST VIEW
                <Card className="shadow-lg">
                    <CardHeader>
                    <CardTitle className="flex items-center gap-3 text-2xl"><UsersIcon className="w-8 h-8 text-primary"/> Datos de los Pasajeros</CardTitle>
                    <CardDescription>El primer pasajero es el responsable de la reserva. Su teléfono es obligatorio.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {bookingPassengers.map((passenger, index) => {
                             const age = calculateAge(passenger.dob);
                             const canHaveInsurance = tour.insurance && tour.insurance.active && age >= tour.insurance.minAge && age <= tour.insurance.maxAge;
                            
                            return (
                                <div key={passenger.id} className="p-4 border rounded-lg space-y-4 relative bg-background">
                                    {bookingPassengers.length > 1 && (
                                        <Button variant="ghost" size="icon" className="absolute top-2 right-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10" onClick={() => removePassenger(passenger.id)}>
                                            <Trash2 className="w-4 h-4"/>
                                        </Button>
                                    )}
                                    <p className="font-semibold">Pasajero {index + 1}</p>
                                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                                        <div className="space-y-2"><Label htmlFor={`firstName-${passenger.id}`}>Nombres</Label><Input id={`firstName-${passenger.id}`} value={passenger.firstName} onChange={(e) => handlePassengerChange(passenger.id, 'firstName', e.target.value)} placeholder="Ej: Juan Carlos" /></div>
                                        <div className="space-y-2"><Label htmlFor={`lastName-${passenger.id}`}>Apellido</Label><Input id={`lastName-${passenger.id}`} value={passenger.lastName} onChange={(e) => handlePassengerChange(passenger.id, 'lastName', e.target.value)} placeholder="Ej: Pérez" /></div>
                                        <div className="space-y-2"><Label htmlFor={`dni-${passenger.id}`}>DNI</Label><Input id={`dni-${passenger.id}`} value={passenger.dni} onChange={(e) => handlePassengerChange(passenger.id, 'dni', e.target.value)} placeholder="Sin puntos ni espacios" /></div>
                                        <div className="space-y-2"><Label htmlFor={`phone-${passenger.id}`}>Teléfono {index > 0 && '(Opcional)'}</Label><Input id={`phone-${passenger.id}`} value={passenger.phone} onChange={(e) => handlePassengerChange(passenger.id, 'phone', e.target.value)} placeholder="Ej: 1122334455" /></div>
                                        <div className="space-y-2">
                                            <Label htmlFor={`dob-${passenger.id}`}>Fecha de nacimiento</Label>
                                            <DatePicker date={passenger.dob ? new Date(passenger.dob) : undefined} setDate={(d) => handlePassengerChange(passenger.id, 'dob', d)} placeholder="Seleccionar fecha" captionLayout="dropdown-buttons" fromYear={new Date().getFullYear() - 100} toYear={new Date().getFullYear()}/>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor={`tierId-${passenger.id}`}>Tipo de Pasajero</Label>
                                            <Select value={passenger.tierId} onValueChange={val => handlePassengerChange(passenger.id, 'tierId', val)}>
                                                <SelectTrigger><SelectValue /></SelectTrigger>
                                                <SelectContent>{availableTiers.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    {tour.insurance?.active && (
                                        <div className="pt-2">
                                            <div className="flex items-center space-x-2">
                                                <Checkbox 
                                                    id={`insurance-guest-${passenger.id}`} 
                                                    checked={insuredGuestIds.includes(passenger.id)}
                                                    onCheckedChange={(checked) => handleGuestInsurance(passenger.id, !!checked)}
                                                    disabled={!canHaveInsurance}
                                                />
                                                <Label htmlFor={`insurance-guest-${passenger.id}`} className="font-normal">
                                                    Añadir seguro (${currencySymbol}{tour.insurance.cost.toLocaleString('es-AR')})
                                                    {!canHaveInsurance && <span className="text-xs text-muted-foreground ml-2">(Fuera de rango de edad)</span>}
                                                </Label>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                        <Button variant="outline" onClick={addPassenger}><PlusIcon className="mr-2 h-4 w-4"/> Añadir Pasajero</Button>
                    </CardContent>
                </Card>
              )}

              {loggedInSellerId ? (
                <p className="text-sm text-center text-muted-foreground mt-2">Venta asignada a tu usuario.</p>
              ) : !loggedInPassenger && (
                <Card className="bg-gradient-to-br from-primary/80 to-accent/80 text-primary-foreground shadow-lg">
                    <CardHeader>
                    <CardTitle className="font-body drop-shadow-xl tracking-wider flex items-center gap-2"><HeartIcon className="w-6 h-6" />¿Querés agilizar tus próximas reservas?</CardTitle>
                    <CardDescription className="text-primary-foreground/80">Crea una cuenta para guardar tus datos y acceder a beneficios exclusivos. ¡Es rápido y fácil!</CardDescription>
                    </CardHeader>
                    <CardContent><Button asChild variant="secondary" className="bg-white text-primary hover:bg-white/90"><Link href="/login?mode=register">Crear una cuenta <ArrowRight className="w-4 h-4 ml-2"/></Link></Button></CardContent>
                </Card>
              )}

            </div>

            <div className="space-y-8 lg:col-span-1">
              <Card className="sticky top-24 shadow-2xl">
                <CardHeader><CardTitle className="flex items-center gap-3 text-2xl"><TicketIcon className="w-8 h-8 text-primary" /> Resumen de reserva</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 space-y-3 rounded-lg bg-secondary/40">
                      {totalPassengers > 0 && (
                        loggedInPassenger ?
                        allPassengers.filter(p => selectedPassengerIds.includes(p.id)).map(p => {
                            const age = calculateAge(p.dob);
                            const finalTier = (childTier && age < 12) ? childTier : adultTier;
                            const price = finalTier.id === 'adult' ? tour.price : finalTier.price;
                            return (<div key={p.id} className="flex justify-between font-medium"><span>{p.fullName} ({finalTier.name})</span><span>{currencySymbol}{price.toLocaleString('es-AR')}</span></div>);
                        }) :
                        bookingPassengers.map(p => {
                          const tier = availableTiers.find(t => t.id === p.tierId);
                          const price = tier?.id === 'adult' ? tour.price : tier?.price ?? 0;
                          return (<div key={p.id} className="flex justify-between font-medium"><span>{p.firstName || 'Pasajero'} ({tier?.name})</span><span>{currencySymbol}{price.toLocaleString('es-AR')}</span></div>);
                        })
                      )}
                      
                      {insuranceCost > 0 && (
                         <div className="flex justify-between font-medium text-sm border-t pt-2 mt-2 border-primary/20">
                            <span className="flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-green-600"/>Seguro Médico</span>
                            <span>{currencySymbol}{insuranceCost.toLocaleString('es-AR')}</span>
                        </div>
                      )}
                  </div>
                  <Separator />
                  <div className="flex items-baseline justify-between text-2xl font-bold">
                    <span>Total</span>
                    <span className="text-3xl sm:text-4xl">{currencySymbol}{totalPrice.toLocaleString('es-AR')}</span>
                  </div>
                  <p className="text-xs text-muted-foreground text-center">El pago se coordina por WhatsApp luego de enviar la solicitud.</p>
                  <Button className="w-full text-lg h-14 rounded-xl group" size="lg" onClick={handleConfirmReservation} disabled={totalPassengers === 0}>
                    Solicitar Reserva
                    <ArrowRight className="w-5 h-5 ml-2 transition-transform duration-300 group-hover:translate-x-1" />
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}
