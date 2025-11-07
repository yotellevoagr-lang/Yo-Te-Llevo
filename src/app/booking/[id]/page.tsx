

"use client"

import { useState, useEffect, useMemo, useCallback, useRef } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import Image from "next/image"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/hooks/use-toast"
import { getTourById, savePassenger, saveReservation, getAllFromCollection_client, getDocumentById, saveDocument } from "@/lib/firestore-services"
import type { Tour, Reservation, Passenger, Seller, CustomLayoutConfig, LayoutCategory, CreatorContext, GalleryItem, LocationVote, GeneralSettings } from "@/lib/types"
import { DatePicker } from "@/components/ui/date-picker"
import { ArrowLeft, CalendarIcon, ClockIcon, MapPin, PlusIcon, TicketIcon, UsersIcon, HeartIcon, ArrowRight, ShieldCheck, Trash2, Loader2, InfoIcon, Video, Edit, ChevronsUpDown, ThumbsUp, MessageSquare } from "lucide-react"
import Link from "next/link"
import { Checkbox } from "@/components/ui/checkbox"
import { getDisplayUrl, cn } from "@/lib/utils"
import { useAuth } from "@/components/auth/auth-provider"
import Autoplay from "embla-carousel-autoplay"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"
import { useGeoAccess } from "@/hooks/use-geo-access"
import { PassengerForm } from "@/components/admin/passenger-form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import argentinaGeoData from '@/lib/argentina-geo.json';
import { ScrollArea } from "@/components/ui/scroll-area"


type ActiveMedia = {
    url: string;
    type: 'image' | 'video';
}

interface GeoVerificationCardProps {
    status: 'prompting' | 'denied' | 'checking';
    onAllow: () => void;
    onManualSubmit: (province: string, city: string) => void;
    manualLocation: { province: string; city: string };
    mainWhatsappNumber?: string;
}

function GeoVerificationCard({ status, onAllow, onManualSubmit, manualLocation, mainWhatsappNumber }: GeoVerificationCardProps) {
    const { user } = useAuth();
    const [province, setProvince] = useState(manualLocation?.province || "");
    const [city, setCity] = useState(manualLocation?.city || "");
    const [localities, setLocalities] = useState<string[]>([]);
    const [voteState, setVoteState] = useState<'idle' | 'voted' | 'voting'>('idle');

    useEffect(() => {
        if (province) {
            const provinceData = argentinaGeoData.localidades as Record<string, string[]>;
            setLocalities(provinceData[province] || []);
            // Don't reset city if it already exists for this province
            if (!provinceData[province]?.includes(city)) {
                 setCity("");
            }
        } else {
            setLocalities([]);
            setCity("");
        }
    }, [province, city]);

    const handleManualSubmit = () => {
        if (province && city) {
            onManualSubmit(province, city);
        }
    };
    
    const handleVote = async () => {
        setVoteState('voting');
        try {
            if (!province || !city) {
                throw new Error("Province and city must be selected to vote.");
            }
            const vote: Omit<LocationVote, 'id'> = {
                province,
                city,
                createdAt: new Date()
            };
            await saveDocument('location_votes', vote);
            setVoteState('voted');
        } catch (error) {
            console.error("Error saving vote:", error);
            setVoteState('idle');
        }
    }
    
    const whatsappLink = mainWhatsappNumber 
    ? `https://wa.me/${mainWhatsappNumber.replace(/\D/g, '')}?text=${encodeURIComponent(`Hola! Me gustaría saber si hay alternativas para viajar desde ${city}, ${province}.`)}`
    : null;

    const isLoading = status === 'checking' || voteState === 'voting';

    if (status === 'denied') {
        return (
            <Card className="border-destructive bg-destructive/5 animate-fade-in-up">
                 <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-destructive">
                        <MapPin className="w-6 h-6"/>
                        Fuera de la Zona de Servicio
                    </CardTitle>
                    <CardDescription className="text-destructive/90">
                        Lo sentimos, actualmente las reservas online sólo están disponibles para nuestra área de cobertura principal.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 text-center">
                    {voteState === 'idle' ? (
                        <>
                            <p className="font-semibold">¿Te gustaría que lleguemos a tu zona?</p>
                            <Button variant="secondary" className="w-full" onClick={handleVote} disabled={isLoading}>
                                {isLoading ? <Loader2 className="animate-spin w-4 h-4 mr-2"/> : <ThumbsUp className="w-4 h-4 mr-2"/>}
                                ¡Sí, quiero que lleguen a mi zona!
                            </Button>
                        </>
                    ) : (
                        <div className="space-y-3 animate-fade-in-up">
                            <p className="font-semibold text-primary">¡Gracias por tu voto!</p>
                            <p className="text-sm text-muted-foreground">Si quieres, puedes comunicarte con nosotros para ver si podemos coordinar una alternativa para tu viaje.</p>
                            {whatsappLink && (
                                <Button asChild className="w-full">
                                    <a href={whatsappLink} target="_blank" rel="noopener noreferrer">
                                        <MessageSquare className="w-4 h-4 mr-2"/>
                                        Contactar por WhatsApp
                                    </a>
                                </Button>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="border-primary bg-primary/5 animate-fade-in-up">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-primary">
                    <MapPin className="w-6 h-6"/>
                    Verificación de Zona de Servicio
                </CardTitle>
                <CardDescription className="text-primary/90">
                    Nuestra página usa un sistema de radio de cobertura y se necesita saber su ubicación para solicitar reserva.
                    Actualmente operamos en San Lorenzo, Santa Fe y alrededores.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <Button onClick={onAllow} size="lg" className="w-full" disabled={isLoading}>
                   {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin"/>}
                    Usar Ubicación
                </Button>
                
                <div className="relative flex items-center">
                    <div className="flex-grow border-t border-muted-foreground/30"></div>
                    <span className="flex-shrink mx-4 text-xs text-muted-foreground uppercase">O</span>
                    <div className="flex-grow border-t border-muted-foreground/30"></div>
                </div>

                <div className="space-y-3">
                    <Label className="font-semibold text-center block">Ingresa tu ubicación manualmente:</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <Label htmlFor="province">Provincia</Label>
                             <Select value={province} onValueChange={setProvince} disabled={isLoading}>
                                <SelectTrigger id="province">
                                    <SelectValue placeholder="Selecciona una provincia" />
                                </SelectTrigger>
                                <SelectContent>
                                    <ScrollArea className="h-72">
                                        {argentinaGeoData.provincias.map(p => (
                                            <SelectItem key={p.nombre} value={p.nombre}>{p.nombre}</SelectItem>
                                        ))}
                                    </ScrollArea>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="city">Localidad</Label>
                            <Select value={city} onValueChange={setCity} disabled={!province || isLoading}>
                                <SelectTrigger id="city">
                                    <SelectValue placeholder="Selecciona una localidad" />
                                </SelectTrigger>
                                <SelectContent>
                                    <ScrollArea className="h-72">
                                        {localities.map(l => (
                                            <SelectItem key={l} value={l}>{l}</SelectItem>
                                        ))}
                                    </ScrollArea>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <Button onClick={handleManualSubmit} variant="secondary" className="w-full" disabled={!province || !city || isLoading}>
                        {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin"/>}
                        Comprobar Ubicación Manual
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

type BookingPassenger = Omit<Passenger, 'id' | 'fullName' | 'dob'> & {
    id: string;
    isNew: boolean;
    fullName: string;
    dob?: Date | null;
};

const isProfileComplete = (p: Partial<Passenger> | Partial<BookingPassenger>): boolean => {
    return !!(p.fullName && p.dni && p.dob);
};

const calculateAge = (dob: any) => {
    if (!dob) return Infinity;
    const birthDate = dob.toDate ? dob.toDate() : new Date(dob);
    if (isNaN(birthDate.getTime())) return Infinity;
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
}

const formatTimeWithUnit = (timeString?: string): string | null => {
    if (!timeString || !timeString.trim()) {
        return null;
    }

    let processedString = timeString.trim();
    const hasNumber = /\d/.test(processedString);

    if (!hasNumber) {
        return processedString; // Return as is if no numbers (e.g., "A confirmar")
    }

    // Standardize hour units to "hs"
    processedString = processedString.replace(/\b(horas|hora|hrs)\b/gi, 'hs');

    // Add "hs" if no unit is present after a number
    if (!/\d\s*hs/i.test(processedString) && !/\b(hs)\b/i.test(processedString)) {
        // Find the last number and insert " hs" after it
        const match = processedString.match(/(\d+)(?=\D*$)/);
        if (match) {
            const lastNumberIndex = processedString.lastIndexOf(match[1]);
            const position = lastNumberIndex + match[1].length;
            processedString = processedString.slice(0, position) + ' hs' + processedString.slice(position);
        }
    }
    
    return processedString;
};

const CollapsibleDescription = ({ text }: { text: string }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    const splitIndex = text.indexOf("🗓 Salida:");
    const hasSplitPoint = splitIndex !== -1;

    const summaryText = hasSplitPoint ? text.substring(0, splitIndex) : text;
    const fullText = text;

    if (!text) {
        return null;
    }
    
    const displayText = isExpanded || !hasSplitPoint ? fullText : summaryText;

    return (
        <div
            className="prose prose-sm max-w-none text-muted-foreground whitespace-pre-wrap cursor-pointer relative group p-4 border rounded-lg shadow-sm bg-background"
            onClick={() => setIsExpanded(!isExpanded)}
        >
            <p>{displayText}</p>
            {hasSplitPoint && (
                <div className="absolute -bottom-2 right-2 flex items-center gap-1 text-xs font-semibold text-primary/80 transition-opacity">
                    <span>{isExpanded ? "Mostrar menos" : "Mostrar más"}</span>
                    <ChevronsUpDown className={cn("w-3 h-3 transition-transform", isExpanded && "rotate-180")} />
                </div>
            )}
        </div>
    );
};

export default function BookingPage() {
  const { id } = useParams()
  const router = useRouter();
  const { toast } = useToast()
  const { user: loggedInUser, userRole } = useAuth();
  const { status: geoStatus, checkBrowserPermission, checkManualLocation, manualLocation, mainWhatsappNumber } = useGeoAccess();

  const autoplay = useRef(
    Autoplay({ delay: 5000, stopOnInteraction: true })
  )

  const [tour, setTour] = useState<Tour | null>(null)
  const [allPassengers, setAllPassengers] = useState<Passenger[]>([])
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [sellers, setSellers] = useState<Seller[]>([])
  const [layoutConfig, setLayoutConfig] = useState<Record<LayoutCategory, Record<string, CustomLayoutConfig>> | null>(null);
  
  const [bookingPassengers, setBookingPassengers] = useState<BookingPassenger[]>([])
  const [insuredGuestIds, setInsuredGuestIds] = useState<string[]>([]);
  
  const [isClient, setIsClient] = useState(false)
  const [loggedInSellerId, setLoggedInSellerId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingMember, setEditingMember] = useState<BookingPassenger | null>(null);
  
  const [activeMedia, setActiveMedia] = useState<ActiveMedia | null>(null);

  const { totalCapacity, availableSeats } = useMemo(() => {
    if (!tour || !layoutConfig) return { totalCapacity: 0, availableSeats: 0 };
    
    const capacity = (tour.transportUnits || []).reduce((acc, unit) => {
        const config = layoutConfig[unit.category]?.[unit.type];
        return acc + (config?.capacity || 0);
    }, 0);
    
    const occupiedSeats = reservations
      .filter(r => r.tripId === tour.id)
      .reduce((sum, r) => sum + r.paxCount, 0);

    return { totalCapacity: capacity, availableSeats: capacity - occupiedSeats };
  }, [tour, reservations, layoutConfig]);

  const addPassenger = useCallback(() => {
     if (bookingPassengers.length > 0 && bookingPassengers.length >= availableSeats) {
        toast({ title: "No hay más lugares", description: "Has alcanzado el número máximo de asientos disponibles para este viaje.", variant: "destructive" });
        return;
    }
    const newGuestId = `P-GUEST-${Date.now()}`;
    setBookingPassengers(prev => [...prev, {
        id: newGuestId, isNew: true, fullName: "", dni: "",
        dob: null, phone: "", family: "", nationality: "Argentina", tierId: 'adult'
    }]);
  }, [bookingPassengers.length, availableSeats, toast]);
  
  useEffect(() => {
    setIsClient(true);
    const sellerIdFromStorage = localStorage.getItem("ytl_employee_id");
    if (sellerIdFromStorage) setLoggedInSellerId(sellerIdFromStorage);
    
    if (id) {
      const fetchData = async () => {
          setIsLoading(true);
          const tourDataRaw = await getTourById(id as string);
          
          const [passengersData, reservationsData, sellersData, layoutsData] = await Promise.all([
              getAllFromCollection_client<Passenger>('passengers'),
              getAllFromCollection_client<Reservation>('reservations'),
              getAllFromCollection_client<Seller>('sellers'),
              getDocumentById<any>('settings', 'layouts'),
          ]);
          
          setAllPassengers(passengersData);
          setReservations(reservationsData);
          setSellers(sellersData);
          setLayoutConfig(layoutsData);
          
          if (tourDataRaw) {
            const date = (tourDataRaw.date as any)?.toDate ? (tourDataRaw.date as any).toDate() : new Date(tourDataRaw.date);
            const tourData = { ...tourDataRaw, date };
            if (new Date(tourData.date) >= new Date()) {
              setTour(tourData);
              if (tourData.backgroundImage) {
                  setActiveMedia({ url: tourData.backgroundImage, type: 'image' });
              } else if (tourData.gallery && tourData.gallery.length > 0) {
                  setActiveMedia({ url: tourData.gallery[0].url, type: tourData.gallery[0].type });
              }
            }
          }
          setIsLoading(false);
      };
      fetchData();
    }
  }, [id]);

  useEffect(() => {
      if (isLoading) return;

      if (loggedInUser) {
          const passengerToBook = allPassengers.find(p => p.id === loggedInUser.id);
          if (passengerToBook) {
              const dobFromDb = passengerToBook.dob as any;
              let dobDate: Date | null = null;
              if (dobFromDb) {
                  dobDate = dobFromDb.toDate ? dobFromDb.toDate() : new Date(dobFromDb);
              }
              setBookingPassengers([{
                  id: passengerToBook.id,
                  isNew: false,
                  fullName: passengerToBook.fullName,
                  dni: passengerToBook.dni,
                  phone: passengerToBook.phone,
                  dob: dobDate,
                  family: passengerToBook.family,
                  nationality: passengerToBook.nationality || "Argentina", 
                  tierId: passengerToBook.tierId || 'adult'
              }]);
          }
      } else if (bookingPassengers.length === 0) {
          addPassenger();
      }
  }, [isLoading, loggedInUser, allPassengers, addPassenger]);
  
  const existingReservationForUser = useMemo(() => {
    if (!loggedInUser || !tour || reservations.length === 0) return null;
    return reservations.find(r => r.tripId === tour.id && r.passengerIds.includes(loggedInUser.id));
  }, [loggedInUser, tour, reservations]);

  const familyMembers = useMemo(() => {
    if (!loggedInUser) return [];
    
    const mainPassengerProfile = allPassengers.find(p => p.id === loggedInUser.id);
    if (!mainPassengerProfile?.family) return [];

    return allPassengers.filter(p => p.family === mainPassengerProfile.family && p.id !== loggedInUser.id);
  }, [loggedInUser, allPassengers]);

  
  const addFamilyMemberToBooking = (passenger: Passenger) => {
    if(bookingPassengers.length >= availableSeats) {
        toast({ title: "No hay más lugares", variant: "destructive" });
        return;
    }
    
    setBookingPassengers(prev => [...prev, {
        id: passenger.id,
        isNew: false,
        fullName: passenger.fullName,
        dni: passenger.dni,
        phone: passenger.phone,
        dob: passenger.dob ? new Date(passenger.dob) : null,
        family: passenger.family,
        nationality: passenger.nationality || 'Argentina',
        tierId: passenger.tierId || 'adult'
    }])
  }

  const removePassenger = (passengerId: string) => {
    if (loggedInUser && passengerId === loggedInUser.id) return; 
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
  
  const handleViewMedia = (item: {url: string, type: 'image' | 'video'}) => {
    setActiveMedia({ url: item.url, type: item.type });
  }

  const handleConfirmReservation = async () => {
    if (!tour || isSubmitting) return;

    for (const passenger of bookingPassengers) {
      if (!isProfileComplete(passenger)) {
        toast({
          title: "Datos incompletos",
          description: `Por favor, completa nombre, DNI y fecha de nacimiento para todos los pasajeros. Falta información para "${passenger.fullName || 'un pasajero'}".`,
          variant: "destructive"
        });
        return;
      }
    }
    
    setIsSubmitting(true);
    
    if (bookingPassengers.length === 0) {
        toast({ title: "No hay pasajeros", description: "Debes añadir al menos un pasajero.", variant: "destructive" });
        setIsSubmitting(false);
        return;
    }
    
    const currentReservations = await getAllFromCollection_client<Reservation>('reservations');
    const reservationsForThisTour = currentReservations.filter(r => r.tripId === tour.id);

    const occupiedSeats = reservationsForThisTour.reduce((sum, r) => sum + r.paxCount, 0);
    const stillAvailable = totalCapacity - occupiedSeats;

    if (bookingPassengers.length > stillAvailable) {
        toast({ title: "¡Cupos Agotados!", description: "Lo sentimos, los lugares se agotaron mientras completabas tus datos.", variant: "destructive", duration: 7000 });
        setIsLoading(true);
        const tourData = await getTourById(id as string);
        if (tourData) setTour(tourData);
        setIsLoading(false);
        setIsSubmitting(false);
        return;
    }

    // DNI Duplication Check
    const allPassengersForTour = await getAllFromCollection_client<Passenger>('passengers');
    const passengerIdsInTour = new Set(reservationsForThisTour.flatMap(r => r.passengerIds));
    const passengersInTour = allPassengersForTour.filter(p => passengerIdsInTour.has(p.id));
    const dnisInTour = new Set(passengersInTour.map(p => p.dni));

    for (const bp of bookingPassengers) {
        if (bp.dni && dnisInTour.has(bp.dni)) {
            toast({
                title: "Pasajero ya registrado",
                description: `El pasajero ${bp.fullName} con DNI ${bp.dni} ya tiene una reserva para este viaje.`,
                variant: "destructive",
                duration: 7000
            });
            setIsSubmitting(false);
            return;
        }
    }

    if (!bookingPassengers[0]?.dni) {
      toast({ title: "Faltan datos", description: "El pasajero principal debe tener un DNI.", variant: "destructive" });
      setIsSubmitting(false);
      return;
    }
    
    const passengerIdsToSave: string[] = [];
    const mainPassengerData = bookingPassengers[0];
    const familyName = mainPassengerData.family || (mainPassengerData.fullName ? `Familia ${mainPassengerData.fullName.split(' ').pop()}` : '');


    for (const bp of bookingPassengers) {
        let passengerIdToSave: string;

        if (bp.isNew) {
            const existingPassenger = bp.dni ? allPassengers.find(p => p.dni === bp.dni) : undefined;
            if (existingPassenger) {
                passengerIdToSave = existingPassenger.id;
            } else {
                 const newPassenger: Omit<Passenger, 'id'> = {
                    fullName: bp.fullName.trim(),
                    dni: bp.dni,
                    phone: bp.phone,
                    dob: bp.dob,
                    family: familyName,
                    nationality: bp.nationality,
                    tierId: bp.tierId,
                 };
                 passengerIdToSave = await savePassenger(newPassenger);
            }
        } else {
            // It's an existing user, just update their info if it was missing.
            const passengerToUpdate: Partial<Passenger> = { id: bp.id };
            let needsUpdate = false;
            if (bp.phone && (!allPassengers.find(p=>p.id===bp.id)?.phone)) {
                 passengerToUpdate.phone = bp.phone;
                 needsUpdate = true;
            }
            if (bp.dob && (!allPassengers.find(p=>p.id===bp.id)?.dob)) {
                 passengerToUpdate.dob = bp.dob;
                 needsUpdate = true;
            }
            if (needsUpdate) {
                await savePassenger(passengerToUpdate, bp.id);
            }
            passengerIdToSave = bp.id;
        }
        passengerIdsToSave.push(passengerIdToSave);
    }
    
    const allPassengersRefetched = await getAllFromCollection_client<Passenger>('passengers');
    setAllPassengers(allPassengersRefetched);

    const finalMainPassenger = allPassengersRefetched.find(p => p.id === passengerIdsToSave[0]);
    
    if (!finalMainPassenger) {
        toast({ title: "Error", description: "No se pudo encontrar al pasajero principal.", variant: "destructive" });
        setIsSubmitting(false);
        return;
    }
    
    const creator: CreatorContext = {
      by: loggedInUser?.id || finalMainPassenger.id,
      role: userRole || 'client',
    };

    const newReservation: Omit<Reservation, 'id'> = {
        tripId: tour!.id,
        passenger: finalMainPassenger.fullName!,
        passengerIds: passengerIdsToSave,
        insuredPassengerIds: insuredGuestIds,
        paxCount: passengerIdsToSave.length,
        assignedSeats: [],
        assignedCabins: [],
        status: "Pendiente",
        paymentStatus: "Pendiente",
        sellerId: loggedInSellerId || 'unassigned',
        finalPrice: totalPrice,
        createdBy: creator
    };

    const reservationId = await saveReservation(newReservation);
    
    toast({ title: "¡Solicitud Enviada!", description: `Tu reserva para ${tour?.destination} ha sido recibida.`, duration: 3000 });

    const confirmationData = { reservation: {id: reservationId, ...newReservation}, tour: tour, seller: sellers.find(s => s.id === (loggedInSellerId || 'unassigned')), mainPassenger: finalMainPassenger };
    sessionStorage.setItem('ytl_last_reservation', JSON.stringify(confirmationData));
    
    router.push('/booking/confirmation');
  }

  const handleUpdateBookingPassenger = async (updatedData: Passenger) => {
    setBookingPassengers(prev =>
        prev.map(p => (p.id === updatedData.id ? { ...p, ...updatedData } : p))
    );
    setEditingMember(null);
    toast({ title: "Datos del pasajero actualizados." });
  }

  const childTier = tour?.pricingTiers?.find(t => t.name.toLowerCase().includes('niño') || t.name.toLowerCase().includes('menor'));

  const totalPrice = useMemo(() => {
    if (!tour) return 0;
    const basePrice = bookingPassengers.reduce((total, p) => {
        const age = calculateAge(p.dob);
        let tierPrice = tour.price;
        if (childTier && age < 12) { tierPrice = childTier.price; }
        return total + tierPrice;
    }, 0);
    const insuranceCost = (tour.insurance?.active ? insuredGuestIds.length * tour.insurance.cost : 0);
    return basePrice + insuranceCost;
  }, [tour, bookingPassengers, childTier, insuredGuestIds]);

  const currencySymbol = tour?.currency === 'USD' ? 'U$S' : '$';
  const isSoldOut = availableSeats <= 0;
  
  const isBookingDisabled = isSoldOut || isSubmitting || geoStatus !== 'allowed';
  const totalPassengers = bookingPassengers.length;
  const allPassengersDataComplete = bookingPassengers.every(isProfileComplete);
  
  const formattedPresentationTime = formatTimeWithUnit(tour?.presentationTime);
  const formattedDepartureTime = formatTimeWithUnit(tour?.departureTime);

   const allMedia = useMemo(() => {
    if (!tour) return [];
    const media: (GalleryItem & { isNew?: boolean })[] = [];
    if (tour.backgroundImage) {
      media.push({ id: 'bg-image', url: tour.backgroundImage, type: 'image' });
    }
    if (tour.gallery) {
      tour.gallery.forEach(item => {
        // Avoid adding if it's already the background image
        if (item.url !== tour.backgroundImage) {
          media.push(item);
        }
      });
    }
    // Remove duplicates by URL
    return media.filter((v, i, a) => a.findIndex(t => t.url === v.url) === i);
  }, [tour]);


  if (!isClient || isLoading || authLoading) {
    return <div className="flex items-center justify-center min-h-screen"><Loader2 className="w-12 h-12 animate-spin text-primary"/></div>;
  }
  
  if (!tour) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center">
          <h1 className="text-2xl font-bold">Viaje no encontrado</h1>
          <p className="text-muted-foreground">Este viaje ya no está disponible o el enlace es incorrecto.</p>
          <Button asChild className="mt-4"><Link href="/tours">Ver otros viajes</Link></Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-muted/20">
      {editingMember && (
          <PassengerForm
              isOpen={!!editingMember}
              onOpenChange={() => setEditingMember(null)}
              onSave={handleUpdateBookingPassenger}
              passenger={editingMember}
              hideBoardingPoint={true}
              hideFamilyInput={true}
          />
      )}
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
                    <CardContent className="p-0">
                         <Carousel 
                            opts={{
                                loop: true,
                            }}
                            className="w-full group"
                            plugins={[autoplay.current]}
                            onMouseEnter={autoplay.current.stop}
                            onMouseLeave={autoplay.current.reset}
                        >
                          <CarouselContent>
                              {allMedia.map((item, index) => (
                                  <CarouselItem key={item.id}>
                                      <div className="relative w-full aspect-video bg-muted">
                                          {item.type === 'image' && ( <Image src={getDisplayUrl(item.url)} alt={`${tour.destination} - ${index + 1}`} layout="fill" objectFit="cover" priority={index === 0} /> )}
                                          {item.type === 'video' && ( <video src={getDisplayUrl(item.url)} className="w-full h-full object-cover" controls autoPlay={false} muted loop /> )}
                                      </div>
                                  </CarouselItem>
                              ))}
                          </CarouselContent>
                          <CarouselPrevious className="absolute left-4 top-1/2 -translate-y-1/2 opacity-0 transition-opacity group-hover:opacity-100" />
                          <CarouselNext className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 transition-opacity group-hover:opacity-100" />
                        </Carousel>
                        
                        <div className="p-4 bg-card">
                             <h1 className="text-3xl sm:text-4xl font-headline text-primary mb-4">{tour.destination}</h1>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-muted-foreground mb-6">
                                {tour.origin && <div className="flex items-center gap-2"><MapPin className="w-5 h-5 text-primary" /><span>Salida desde {tour.origin}</span></div>}
                                <div className="flex items-center gap-2"><CalendarIcon className="w-5 h-5 text-primary" /><span>{new Date(tour.date).toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span></div>
                                {formattedPresentationTime && <div className="flex items-center gap-2"><ClockIcon className="w-5 h-5 text-primary" /><span>Presentación: {formattedPresentationTime}</span></div>}
                                {formattedDepartureTime && <div className="flex items-center gap-2"><ClockIcon className="w-5 h-5 text-primary" /><span>Salida: {formattedDepartureTime}</span></div>}
                            </div>
                            {tour.description && <CollapsibleDescription text={tour.description} />}
                        </div>
                    </CardContent>
                </Card>

                {existingReservationForUser ? (
                    <Card className="bg-primary/10 border-primary">
                        <CardHeader className="text-center">
                            <CardTitle>Ya tienes una reserva</CardTitle>
                            <CardDescription>
                                Detectamos que ya tienes una reserva para este viaje. Si quieres modificarla, añadir más personas o tienes alguna consulta, por favor, ponte en contacto con la agencia.
                            </CardDescription>
                        </CardHeader>
                    </Card>
                ) : (geoStatus !== 'allowed') ? (
                     <GeoVerificationCard 
                        status={geoStatus}
                        onAllow={checkBrowserPermission}
                        onManualSubmit={checkManualLocation}
                        manualLocation={manualLocation}
                        mainWhatsappNumber={mainWhatsappNumber}
                    />
                ) : (
                    <fieldset disabled={isSubmitting}>
                        <Card className={cn("shadow-lg", isSubmitting && "bg-muted/50")}>
                            <CardHeader>
                            <CardTitle className="flex items-center gap-3 text-2xl"><UsersIcon className="w-8 h-8 text-primary"/> Datos de los Pasajeros</CardTitle>
                            <CardDescription>
                                {isSoldOut ? 'Este viaje está agotado.' : 'Selecciona quiénes viajan. Si faltan datos, te pediremos que los completes.'}
                            </CardDescription>
                            </CardHeader>
                            
                            <CardContent className="space-y-6">
                                {bookingPassengers.map((passenger, index) => {
                                    const isMainPassenger = index === 0;
                                    return (
                                        <div key={passenger.id} className="p-4 border rounded-lg bg-background">
                                            <div className="flex justify-between items-center mb-2">
                                                <h3 className="font-semibold text-lg">{isMainPassenger ? 'Pasajero Principal' : 'Acompañante'}</h3>
                                                {!isMainPassenger && (
                                                    <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive hover:bg-destructive/10" onClick={() => removePassenger(passenger.id)}><Trash2 className="w-4 h-4"/></Button>
                                                )}
                                            </div>
                                            {isProfileComplete(passenger) ? (
                                                <div className="flex items-center justify-between">
                                                    <p>{passenger.fullName}</p>
                                                    <Button variant="link" onClick={() => setEditingMember(passenger)}>Editar</Button>
                                                </div>
                                            ) : (
                                                <div className="space-y-4 pt-2">
                                                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                                                        <div className="space-y-2"><Label>Nombre Completo</Label><Input value={passenger.fullName} onChange={(e) => handlePassengerChange(passenger.id, 'fullName', e.target.value)} placeholder="Ej: Juan Carlos Pérez" /></div>
                                                        <div className="space-y-2"><Label>DNI</Label><Input value={passenger.dni} onChange={(e) => handlePassengerChange(passenger.id, 'dni', e.target.value)} placeholder="Sin puntos ni espacios" /></div>
                                                        {isMainPassenger && <div className="space-y-2"><Label>Teléfono (Obligatorio)</Label><Input value={passenger.phone || ''} onChange={(e) => handlePassengerChange(passenger.id, 'phone', e.target.value)} placeholder="Ej: 1122334455" /></div>}
                                                        <div className="space-y-2"><Label>Fecha de nacimiento</Label><DatePicker date={passenger.dob} setDate={(d) => handlePassengerChange(passenger.id, 'dob', d)} placeholder="Seleccionar fecha" captionLayout="dropdown-buttons" fromYear={new Date().getFullYear() - 100} toYear={new Date().getFullYear()} /></div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                                
                                {familyMembers.length > 0 && (
                                    <div className="p-4 border rounded-lg space-y-3">
                                        <Label className="font-semibold">Añadir desde mi grupo familiar</Label>
                                        {familyMembers.map(member => {
                                            const isMemberComplete = isProfileComplete(member);
                                            const isSelected = bookingPassengers.some(bp => bp.id === member.id);
                                            return (
                                                <div key={member.id} className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50">
                                                    <div className="flex items-center gap-2">
                                                        <Checkbox id={`member-${member.id}`} checked={isSelected} onCheckedChange={(checked) => checked ? addFamilyMemberToBooking(member) : removePassenger(member.id)} />
                                                        <Label htmlFor={`member-${member.id}`} className="font-normal cursor-pointer">{member.fullName}</Label>
                                                    </div>
                                                    {!isMemberComplete && (
                                                        <Button variant="outline" size="sm" onClick={() => setEditingMember(member as BookingPassenger)}>Completar Datos</Button>
                                                    )}
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}

                                {bookingPassengers.length < availableSeats && <Button variant="outline" onClick={addPassenger}><PlusIcon className="mr-2 h-4 w-4"/> Añadir Acompañante</Button>}</CardContent>
                        </Card>
                    </fieldset>
                )}
            </div>

            <div className="space-y-8 lg:col-span-1">
              <Card className="sticky top-24 shadow-2xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3 text-2xl"><TicketIcon className="w-8 h-8 text-primary" /> Resumen de reserva</CardTitle>
                  <CardDescription className="flex justify-between items-center">
                    <span>Lugares a reservar: {bookingPassengers.length}</span>
                    <span className={cn("font-bold", availableSeats > 5 ? "text-green-600" : "text-amber-600")}>¡Quedan {availableSeats} disponibles!</span>
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                <div className="p-4 space-y-3 rounded-lg bg-secondary/40">
                    {totalPassengers > 0 && (
                        bookingPassengers.map((p, index) => {
                        const age = calculateAge(p.dob);
                        let price = tour.price;
                        if (childTier && age < 12) { price = childTier.price; }
                        return (<div key={p.id || index} className="flex justify-between font-medium"><span>{p.fullName || `Pasajero ${index+1}`}</span><span>{currencySymbol}{price.toLocaleString('es-AR')}</span></div>);
                        })
                    )}
                    
                    {tour.insurance?.active && insuredGuestIds.length > 0 && (
                        <div className="flex justify-between font-medium text-sm border-t pt-2 mt-2 border-primary/20">
                            <span className="flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-green-600"/>Seguro Médico ({insuredGuestIds.length})</span>
                            <span>{currencySymbol}{(insuredGuestIds.length * tour.insurance.cost).toLocaleString('es-AR')}</span>
                        </div>
                    )}
                </div>
                <Separator />
                <div className="flex items-end justify-between text-2xl font-bold">
                    <span>Total</span>
                    <span className="text-3xl sm:text-4xl">{currencySymbol}{totalPrice.toLocaleString('es-AR')}</span>
                </div>
                {isSoldOut ? (
                    <Button className="w-full text-lg h-14 rounded-xl" size="lg" disabled> AGOTADO </Button>
                ) : (
                    <>
                        <p className="text-xs text-muted-foreground text-center">El pago se coordina por WhatsApp luego de enviar la solicitud.</p>
                        <Button className="w-full text-lg h-14 rounded-xl group" size="lg" onClick={handleConfirmReservation} disabled={isBookingDisabled || totalPassengers === 0 || !allPassengersDataComplete}>
                            {isSubmitting ? <Loader2 className="w-6 h-6 animate-spin"/> : 'Solicitar Reserva'}
                            {!isSubmitting && <ArrowRight className="w-5 h-5 ml-2 transition-transform duration-300 group-hover:translate-x-1" />}
                        </Button>
                    </>
                )}
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
