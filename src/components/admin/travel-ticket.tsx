

"use client"

import React, { useState, useEffect } from "react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import type { Ticket as TicketType, Tour, Seller, BoardingPoint, Pension, Passenger } from "@/lib/types"
import { cn } from "@/lib/utils"
import { Logo } from "@/components/logo"
import Image from "next/image"
import { 
    Users, MapPin, CalendarDays, BedDouble, Utensils, Bus, Clock, Armchair, 
    FileText, Info, AlertTriangle, UserSquare, UserCircle, Building, TicketIcon, QrCode, Loader2
} from "lucide-react"
import { generateDisplayID } from "@/lib/utils"

interface TravelTicketProps {
  ticket: TicketType;
  passenger: Passenger | null;
  allPassengers: Passenger[];
  tour?: Tour;
  seller?: Seller;
  boardingPoint?: BoardingPoint;
  pension?: Pension;
}

const InfoSection = ({ title, icon: Icon, children, className, titleClassName, contentClassName }: { title:string, icon?: React.ElementType, children: React.ReactNode, className?: string, titleClassName?: string, contentClassName?: string }) => (
    <div className={cn("rounded-lg border bg-card shadow-sm overflow-hidden", className)}>
        <div className={cn("bg-primary text-primary-foreground p-2 flex items-center gap-2", titleClassName)}>
            {Icon && <Icon className="w-5 h-5" />}
            <h3 className="font-bold text-sm uppercase tracking-wider">{title}</h3>
        </div>
        <div className={cn("p-3 space-y-1.5 text-sm", contentClassName)}>
            {children}
        </div>
    </div>
);

const InfoRow = ({ label, value }: { label: string, value?: React.ReactNode }) => (
    <div className="flex justify-between items-start gap-2">
        <span className="font-semibold text-muted-foreground flex-shrink-0">{label}:</span>
        <span className="text-right font-medium text-foreground break-words">{value || "—"}</span>
    </div>
)

function QRCodeDisplay({ url, onQrLoad }: { url: string; onQrLoad: () => void; }) {
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const handleLoad = () => {
        setIsLoading(false);
        onQrLoad();
    };

    return (
        <div className="relative w-[150px] h-[150px]">
            {isLoading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-600">
                    <Loader2 className="w-8 h-8 animate-spin"/>
                    <p className="text-xs mt-2">Cargando QR...</p>
                </div>
            )}
            {error && (
                 <div className="absolute inset-0 flex flex-col items-center justify-center text-destructive">
                    <QrCode className="w-8 h-8"/>
                    <p className="text-xs mt-2 text-center">{error}</p>
                </div>
            )}
            <Image 
                src={url} 
                alt="Código QR del Ticket" 
                width={150} 
                height={150}
                unoptimized // Important for external URLs that don't need Next.js optimization
                className={cn(isLoading || error ? "opacity-0" : "opacity-100")}
                onLoad={handleLoad}
                onError={() => {
                    setIsLoading(false);
                    setError("Error al cargar QR");
                }}
            />
        </div>
    );
}


export const TravelTicket = React.forwardRef<HTMLDivElement, TravelTicketProps>(({ ticket, passenger, allPassengers, tour, seller, boardingPoint, pension }, ref) => {
  const reservation = ticket.reservation;
  
  const reservationPassengers = (reservation.passengerIds || []).map(id => allPassengers.find(p => p.id === id)).filter(Boolean) as Passenger[];

  // Coordinator: use direct field first, then fall back to first transport unit with a coordinator
  const unitWithCoordinator = tour?.transportUnits?.find(u => u.coordinator);
  const coordinatorName = tour?.coordinator || unitWithCoordinator?.coordinator;
  const coordinatorPhone = tour?.coordinatorPhone || unitWithCoordinator?.coordinatorPhone;

  const assignedLocations = [
    ...(reservation.assignedSeats || []).map(s => s.seatId),
    ...(reservation.assignedCabins || []).map(c => c.cabinId)
  ].join(', ') || "Asignada por coordinador";

  const getDurationText = () => {
    if (!tour) return "N/A";
    const days = tour.days;
    const nights = tour.nights;
    if (days && nights) return `${days} días / ${nights} noches`;
    if (nights) return `${nights} ${nights > 1 ? 'noches' : 'noche'}`;
    if (days) return `${days} ${days > 1 ? 'días' : 'día'}`;
    return "Solo ida";
  };
  const durationText = getDurationText();

  // Generate dynamic IDs for display
  const displayReservationID = generateDisplayID('R', reservation, tour, passenger || undefined);
  const displayTicketID = generateDisplayID('T', reservation, tour, passenger || undefined);
  
  // Placeholder values when data is missing
  const passengerName = passenger?.fullName || ticket.passengerName || "Sin pasajero";
  const passengerDni = passenger?.dni || ticket.passengerDni || "N/A";
    
  return (
    <div ref={ref} className={cn(
      "bg-slate-100 text-black rounded-lg overflow-hidden shadow-2xl border",
      "w-[794px] min-h-[1123px] p-6 font-sans flex flex-col gap-4"
    )}
    >
        <header className="flex justify-between items-center border-b-2 border-primary/20 pb-4">
           <Logo />
           <div className="text-right">
                <h2 className="text-2xl font-bold text-primary flex items-center gap-2"><TicketIcon/> PASE DE ABORDO</h2>
                <p className="text-sm text-muted-foreground">ID Reserva: {displayReservationID}</p>
                <p className="text-sm text-muted-foreground font-mono">T-ID: {displayTicketID}</p>
           </div>
        </header>

        <main className="grid grid-cols-12 gap-4 flex-grow">
            {/* Columna Izquierda */}
            <div className="col-span-8 space-y-3">
                 <InfoSection title="Pasajeros" icon={Users}>
                    {/* Main passenger (titular) */}
                    <InfoRow 
                        key={passenger?.id || 'no-passenger'} 
                        label="Titular" 
                        value={`${passengerName} (DNI: ${passengerDni})`} 
                    />
                    {/* Other passengers (integrantes) - only show name and DNI */}
                    {reservationPassengers.filter(p => p.id !== passenger?.id).length > 0 && (
                        <>
                            <div className="border-t my-2 pt-2">
                                <span className="text-xs font-semibold text-muted-foreground uppercase">Integrantes:</span>
                            </div>
                            {reservationPassengers.filter(p => p.id !== passenger?.id).slice(0, 9).map((p) => (
                                <InfoRow key={p.id} label={p.fullName} value={`DNI: ${p.dni}`} />
                            ))}
                            {reservationPassengers.filter(p => p.id !== passenger?.id).length > 9 && (
                                <InfoRow label="..." value={`+ ${reservationPassengers.filter(p => p.id !== passenger?.id).length - 9} integrantes más`} />
                            )}
                        </>
                    )}
                 </InfoSection>
                 <div className="grid grid-cols-2 gap-3">
                    <InfoSection title="Origen y Destino" icon={MapPin}>
                        <InfoRow label="Origen" value={tour?.origin || "N/A"} />
                        <InfoRow label="Destino" value={tour?.destination || "N/A"} />
                    </InfoSection>
                    <InfoSection title="Fecha de Salida" icon={CalendarDays}>
                        <InfoRow label="Fecha" value={tour?.date ? format(new Date(tour.date), "dd/MM/yyyy", { locale: es }) : "N/A"} />
                    </InfoSection>
                 </div>
                  <InfoSection title="Alojamiento y Comidas" icon={BedDouble}>
                    <InfoRow label="Duración" value={durationText} />
                    <InfoRow label="Régimen de Comidas" value={pension?.name || 'Sin pensión'} />
                 </InfoSection>
                 <InfoSection title="Datos del Transporte" icon={Bus}>
                    <InfoRow label="Empresa" value={tour?.bus || "N/A"} />
                    <InfoRow label="Embarque" value={boardingPoint?.name} />
                    <InfoRow label="Plataforma" value={tour?.platform || "N/A"} />
                 </InfoSection>
                  <div className="grid grid-cols-2 gap-3">
                    <InfoSection title="Horario" icon={Clock}>
                        <InfoRow label="Presentación" value={tour?.presentationTime || "N/A"} />
                        <InfoRow label="Salida" value={tour?.departureTime || "N/A"} />
                    </InfoSection>
                     <InfoSection title="Butacas" icon={Armchair}>
                        <InfoRow label="Ubicación" value={assignedLocations} />
                    </InfoSection>
                  </div>
                   <InfoSection title="Condiciones" icon={FileText} contentClassName="text-xs text-center text-muted-foreground">
                        <p>{tour?.cancellationPolicy || "Consulte la política de cancelación."}</p>
                    </InfoSection>
            </div>

            {/* Columna Derecha */}
            <div className="col-span-4 space-y-3 flex flex-col">
                 <InfoSection title="Agencia" icon={Building}>
                    <InfoRow label="Nombre" value="YO TE LLEVO" />
                 </InfoSection>
                 <InfoSection title="Coordinador/a" icon={UserSquare}>
                    <InfoRow label="Nombre" value={coordinatorName || "N/A"} />
                    <InfoRow label="Teléfono" value={coordinatorPhone || "N/A"} />
                 </InfoSection>
                  <InfoSection title="Vendedor/a" icon={UserCircle}>
                    <InfoRow label="Nombre" value={seller?.name} />
                 </InfoSection>
                  <InfoSection title="Observaciones" icon={Info} contentClassName="text-center font-medium">
                     <p>{tour?.observations || "Obligatorio llevar D.N.I."}</p>
                 </InfoSection>
                 <div className="flex-grow flex items-center justify-center">
                    <div className="flex items-center justify-center bg-gray-200 rounded-md p-2">
                        <QRCodeDisplay 
                            url={ticket.qrCodeUrl} 
                            onQrLoad={() => {
                                // This is a placeholder as the logic is now handled in the page
                            }}
                        />
                    </div>
                 </div>
                  <InfoSection title="Importante" icon={AlertTriangle} titleClassName="bg-destructive text-destructive-foreground" contentClassName="text-center font-bold text-lg text-destructive">
                    <p>¡PUNTUALIDAD CON LOS HORARIOS!</p>
                 </InfoSection>
            </div>
        </main>
    </div>
  )
})
TravelTicket.displayName = "TravelTicket"

