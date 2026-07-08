
"use client"

import { useState, useMemo, useEffect, useRef } from "react"
import {
  Card,
  CardContent,
} from "@/components/ui/card"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Download, TicketCheck, User, Search } from "lucide-react"
import { TravelTicket } from "@/components/admin/travel-ticket"
import type { Tour, Ticket, Seller, Reservation, Passenger, BoardingPoint, Pension } from "@/lib/types"
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';
import { useToast } from "@/hooks/use-toast"
import { getAllFromCollection_client } from "@/lib/firestore-services"

export default function TicketsAdminPage() {
  const { toast } = useToast();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [tours, setTours] = useState<Tour[]>([]);
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [passengers, setPassengers] = useState<Passenger[]>([]);
  const [boardingPoints, setBoardingPoints] = useState<BoardingPoint[]>([]);
  const [pensions, setPensions] = useState<Pension[]>([]);
  const [allTickets, setAllTickets] = useState<Ticket[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [openTripIds, setOpenTripIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const ticketRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const initializedRef = useRef(false);

  const fetchData = async () => {
      try {
        setIsLoading(true);
        const [reservationsData, toursData, sellersData, passengersData, boardingPointsData, pensionsData] = await Promise.all([
            getAllFromCollection_client<Reservation>('reservations'),
            getAllFromCollection_client<Tour>('tours'),
            getAllFromCollection_client<Seller>('sellers'),
            getAllFromCollection_client<Passenger>('passengers'),
            getAllFromCollection_client<BoardingPoint>('boarding_points'),
            getAllFromCollection_client<Pension>('pensions')
        ]);
        
        const processedTours = toursData.map(t => {
          const date = (t.date as any)?.toDate ? (t.date as any).toDate() : new Date(t.date);
          return { ...t, date };
        });
        
        setReservations(reservationsData);
        setTours(processedTours);
        setSellers(sellersData);
        setPassengers(passengersData);
        setBoardingPoints(boardingPointsData);
        setPensions(pensionsData);
      } catch (error) {
        console.error('Error cargando datos:', error);
        toast({
          title: "Error",
          description: "No se pudieron cargar los datos",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Effect to regenerate tickets whenever underlying data changes
  // Generate ONE ticket per reservation (for the main passenger) - SIN FILTROS
  useEffect(() => {
    // Mostrar todas las reservas, sin importar el estado
    const generatedTickets: Ticket[] = reservations.map((res: Reservation): Ticket | null => {
        const tour = tours.find(t => t.id === res.tripId);
        
        // Get the main passenger (first in the list) or use placeholder
        const mainPassengerId = res.passengerIds?.[0];
        const mainPassenger = mainPassengerId ? passengers.find(p => p.id === mainPassengerId) : null;
        
        const qrData = { tId: res.id, pId: mainPassenger?.id || 'sin-pasajero' };

        return {
            id: res.id,
            passengerId: mainPassenger?.id || 'sin-pasajero',
            reservationId: res.id,
            tripId: res.tripId,
            passengerName: mainPassenger?.fullName || 'Sin pasajero asignado',
            passengerDni: mainPassenger?.dni || "N/A",
            qrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(JSON.stringify(qrData))}`,
            reservation: res,
            boardingPointId: res.boardingPointId || mainPassenger?.boardingPointId,
        };
    }).filter((t): t is Ticket => t !== null);
    setAllTickets(generatedTickets);
  }, [reservations, tours, passengers]);


  const ticketsByTrip = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const upcomingTripIds = new Set(
      tours
        .filter(t => {
          const d = t.date instanceof Date ? t.date : new Date(t.date as any);
          return d >= today;
        })
        .map(t => t.id)
    );

    const q = searchQuery.trim().toLowerCase();
    const filtered = allTickets.filter(ticket => {
      if (!upcomingTripIds.has(ticket.tripId)) return false;
      if (!q) return true;
      const tour = tours.find(t => t.id === ticket.tripId);
      return (
        tour?.destination.toLowerCase().includes(q) ||
        ticket.passengerName.toLowerCase().includes(q)
      );
    });

    return filtered.reduce((acc, ticket) => {
      const { tripId } = ticket;
      if (!acc[tripId]) acc[tripId] = [];
      acc[tripId].push(ticket);
      return acc;
    }, {} as Record<string, Ticket[]>);
  }, [allTickets, searchQuery, tours]);

  useEffect(() => {
    const keys = Object.keys(ticketsByTrip);
    if (!initializedRef.current && keys.length > 0) {
      setOpenTripIds(keys);
      initializedRef.current = true;
    }
  }, [ticketsByTrip]);

  const handleDownload = async (ticket: Ticket) => {
    const uniqueTicketId = `${ticket.id}-${ticket.passengerId}`;
    const ticketElement = ticketRefs.current[uniqueTicketId];
    if (!ticketElement) return;

    try {
        const images = Array.from(ticketElement.getElementsByTagName('img'));
        await Promise.all(images.map(img => {
            if (img.complete) return Promise.resolve();
            return new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = () => reject(new Error(`Failed to load image: ${img.src}`));
            });
        }));

        const dataUrl = await toPng(ticketElement, { 
            quality: 1.0, 
            pixelRatio: 2.5,
        });
        
        const pdf = new jsPDF({
            orientation: "p", // portrait
            unit: "mm",
            format: "a4"
        });

        const pdfWidth = pdf.internal.pageSize.getWidth();
        const imgProps = pdf.getImageProperties(dataUrl);
        const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;
        
        pdf.addImage(dataUrl, 'PNG', 0, 0, pdfWidth, imgHeight);
        pdf.save(`Ticket_${ticket.passengerName.replace(/\s+/g, '_')}.pdf`);

    } catch (error: any) {
        console.error('Error al generar el PDF del ticket:', error);
        toast({
            title: "Error al generar PDF",
            description: "No se pudo generar el PDF. Puede que falte el logo de la empresa. Súbelo en Configuración.",
            variant: "destructive",
            duration: 7000
        });
    }
  };


  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Gestión de Tickets de Viaje</h2>
        <p className="text-muted-foreground">
          Visualiza, descarga e imprime los tickets para los pasajeros con reservas confirmadas.
        </p>
      </div>

       <Card>
        <CardContent className="pt-6">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                    placeholder="Buscar viaje por destino..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="pl-9"
                />
            </div>
        </CardContent>
       </Card>

      {isLoading ? (
        <Card>
            <CardContent className="p-12 text-center flex flex-col items-center gap-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                <p className="text-muted-foreground">Cargando tickets...</p>
            </CardContent>
        </Card>
      ) : Object.keys(ticketsByTrip).length === 0 ? (
        <Card>
            <CardContent className="p-12 text-center flex flex-col items-center gap-4">
                <TicketCheck className="w-16 h-16 text-muted-foreground/50"/>
                <p className="text-muted-foreground">
                    No hay tickets disponibles.
                </p>
            </CardContent>
        </Card>
      ) : (
        <Accordion type="multiple" className="w-full space-y-4" value={openTripIds} onValueChange={setOpenTripIds}>
         {Object.entries(ticketsByTrip).map(([tripId, tripTickets]) => {
            const tour = tours.find(t => t.id === tripId);
            if (!tour) return null;

            return (
                 <AccordionItem value={tripId} key={tripId} className="border-b-0">
                    <Card>
                        <AccordionTrigger className="p-4 text-lg font-semibold hover:no-underline hover:bg-muted/50">
                            {tour.destination} ({tripTickets.length} tickets)
                        </AccordionTrigger>
                        <AccordionContent className="p-0">
                             <Accordion type="multiple" className="w-full">
                                {tripTickets.map((ticket) => {
                                    const passenger = passengers.find(p => p.id === ticket.passengerId) || null;
                                    const uniqueTicketId = `${ticket.id}-${ticket.passengerId}`;
                                    return (
                                        <AccordionItem value={uniqueTicketId} key={uniqueTicketId} className="border-t">
                                            <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-muted/50">
                                                 <div className="flex items-center gap-4 text-left">
                                                    <div className="p-2 rounded-full bg-primary/10 text-primary"><User className="w-5 h-5"/></div>
                                                    <div>
                                                        <p className="font-semibold">{ticket.passengerName}</p>
                                                        <p className="text-sm text-muted-foreground">DNI: {ticket.passengerDni}</p>
                                                    </div>
                                                  </div>
                                            </AccordionTrigger>
                                            <AccordionContent>
                                                <div className="bg-slate-200 p-4 space-y-4 flex flex-col items-center">
                                                    <div
                                                        data-ticket
                                                        className="w-[794px]"
                                                        ref={el => { ticketRefs.current[uniqueTicketId] = el; }}
                                                    >
                                                        <TravelTicket 
                                                            ticket={ticket}
                                                            passenger={passenger}
                                                            allPassengers={passengers}
                                                            tour={tour} 
                                                            seller={sellers.find(s => s.id === ticket.reservation.sellerId)} 
                                                            boardingPoint={boardingPoints.find(bp => bp.id === ticket.boardingPointId)} 
                                                            pension={pensions.find(p => p.id === ticket.reservation.pensionId)}
                                                        />
                                                    </div>
                                                    <div className="flex justify-end w-full px-4">
                                                    <Button onClick={() => handleDownload(ticket)}>
                                                        <Download className="mr-2 h-4 w-4" />
                                                        Descargar PDF
                                                    </Button>
                                                    </div>
                                                </div>
                                            </AccordionContent>
                                        </AccordionItem>
                                    )
                                })}
                             </Accordion>
                        </AccordionContent>
                    </Card>
                 </AccordionItem>
            )
         })}
        </Accordion>
      )}
    </div>
  )
}
