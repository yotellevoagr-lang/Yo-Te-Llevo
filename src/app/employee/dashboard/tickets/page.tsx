
"use client"

import { useState, useMemo, useEffect, useRef } from "react"
import {
  Card,
  CardContent,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Download, TicketCheck, User, Plane, Printer } from "lucide-react"
import { TravelTicket } from "@/components/admin/travel-ticket"
import type { Tour, Ticket, Seller, Reservation, Passenger, BoardingPoint, Pension } from "@/lib/types"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button";
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
  const [selectedTripId, setSelectedTripId] = useState<string>("all");
  const ticketRefs = useRef<Record<string, HTMLDivElement | null>>({});
  
  const fetchData = async () => {
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
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Effect to regenerate tickets whenever underlying data changes
  useEffect(() => {
    const confirmedReservations = reservations.filter((r: Reservation) => r.status === 'Confirmado');
    
    const generatedTickets = confirmedReservations.flatMap((res: Reservation): Ticket[] => {
        if (!res.passengerIds || res.passengerIds.length === 0) return [];

        const tour = tours.find(t => t.id === res.tripId);
        if (!tour) return [];

        return res.passengerIds.map(passengerId => {
            const passenger = passengers.find(p => p.id === passengerId);
            if (!passenger) return null;
            
            const qrData = { tId: res.id, pId: passenger.id }; // Simplified QR data

            return {
                id: res.id, // The ticket ID will be generated dynamically on render
                passengerId: passenger.id,
                reservationId: res.id,
                tripId: res.tripId,
                passengerName: passenger.fullName,
                passengerDni: passenger.dni || "N/A",
                qrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(JSON.stringify(qrData))}`,
                reservation: res,
                boardingPointId: res.boardingPointId,
            };
        }).filter((t): t is Ticket => t !== null);
    });
    setAllTickets(generatedTickets);
  }, [reservations, tours, passengers]);


  const ticketsByTrip = useMemo(() => {
    const activeToursIds = new Set(tours.filter(t => t.date && new Date(t.date) >= new Date()).map(t => t.id));

    const activeTickets = allTickets.filter(ticket => activeToursIds.has(ticket.tripId));

    const filtered = selectedTripId === "all" 
      ? activeTickets 
      : activeTickets.filter(ticket => ticket.tripId === selectedTripId);

    return filtered.reduce((acc, ticket) => {
      const { tripId } = ticket;
      if (!acc[tripId]) {
        acc[tripId] = [];
      }
      acc[tripId].push(ticket);
      return acc;
    }, {} as Record<string, Ticket[]>);
  }, [allTickets, selectedTripId, tours]);
  
  const toursWithTickets = useMemo(() => {
      const tripIdsWithTickets = new Set(allTickets.map(t => t.tripId));
      return tours.filter(t => tripIdsWithTickets.has(t.id) && t.date && new Date(t.date) >= new Date());
  }, [allTickets, tours]);

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
        <CardContent className="pt-6 flex items-center gap-4">
            <Label htmlFor="trip-filter" className="text-nowrap">Filtrar por viaje:</Label>
            <Select onValueChange={setSelectedTripId} value={selectedTripId}>
                <SelectTrigger id="trip-filter" className="w-[300px]">
                    <SelectValue placeholder="Seleccionar viaje" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">Todos los viajes</SelectItem>
                    {toursWithTickets.map(tour => (
                        <SelectItem key={tour.id} value={tour.id}>{tour.destination}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </CardContent>
       </Card>

      {Object.keys(ticketsByTrip).length === 0 ? (
        <Card>
            <CardContent className="p-12 text-center flex flex-col items-center gap-4">
                <TicketCheck className="w-16 h-16 text-muted-foreground/50"/>
                <p className="text-muted-foreground">
                    No hay tickets para el viaje seleccionado o no hay reservas confirmadas.
                </p>
            </CardContent>
        </Card>
      ) : (
        <Accordion type="multiple" className="w-full space-y-4" defaultValue={Object.keys(ticketsByTrip)}>
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
                                    const passenger = passengers.find(p => p.id === ticket.passengerId);
                                    if (!passenger) return null;
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
                                                        ref={el => ticketRefs.current[uniqueTicketId] = el}
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
