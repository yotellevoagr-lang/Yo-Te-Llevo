
"use client"

import { useState, useMemo, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import type { Tour, Reservation } from "@/lib/types";
import { getAllFromCollection_client, deleteDocument } from "@/lib/firestore-services";
import { Loader2, History, Edit, Trash2, Calendar, User, CreditCard, DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { TripForm } from "./trip-form";
import { Badge } from "../ui/badge";
import { toTitleCase } from "@/lib/utils";

interface HistoryDashboardProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

const InfoRow = ({ label, value }: { label: string, value: string | number | null | undefined }) => (
    <div className="flex justify-between items-center text-xs">
        <p className="text-muted-foreground">{label}</p>
        <p className="font-medium">{value || 'N/A'}</p>
    </div>
);


export function HistoryDashboard({ isOpen, onOpenChange }: HistoryDashboardProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [tours, setTours] = useState<Tour[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [editingTour, setEditingTour] = useState<Tour | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  
  const { toast } = useToast();

  const fetchData = async () => {
    setIsLoading(true);
    const [toursData, reservationsData] = await Promise.all([
      getAllFromCollection_client<Tour>('tours'),
      getAllFromCollection_client<Reservation>('reservations')
    ]);
    const processedTours = toursData.map(t => ({
      ...t,
      date: t.date ? new Date((t.date as any).seconds ? (t.date as any).toDate() : t.date) : new Date()
    }));
    setTours(processedTours);
    setReservations(reservationsData);
    setIsLoading(false);
  }

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
            // This is a simplified deletion. In a real app, you'd want a Cloud Function to handle this atomically.
            const reservationsToDelete = reservations.filter(r => r.tripId === tourId);
            for (const res of reservationsToDelete) {
                await deleteDocument('reservations', res.id);
            }
            await deleteDocument('tours', tourId);
            toast({ title: "Viaje eliminado", description: "El viaje y sus reservas han sido eliminados." });
            fetchData();
        } catch (error) {
            toast({ title: "Error", description: "No se pudo eliminar el viaje.", variant: "destructive" });
        }
    }
  }
  
  const handleSaveTour = (savedTour: Tour) => {
      // For now, just refetch data. More complex logic could update state directly.
      fetchData();
      setIsFormOpen(false);
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

  return (
    <>
      <TripForm 
          isOpen={isFormOpen} 
          onOpenChange={setIsFormOpen} 
          onSave={handleSaveTour} 
          tour={editingTour} 
          boardingPoints={[]} // This might need to be fetched if editing requires it
      />
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
                            <AccordionContent className="p-3 border-t bg-muted/20">
                                <h4 className="font-semibold mb-2">Reservas ({reservations.filter(r => r.tripId === tour.id).length})</h4>
                                <div className="space-y-1">
                                    {reservations.filter(r => r.tripId === tour.id).map(res => {
                                        const paidAmount = res.installments?.details.reduce((sum, inst) => inst.isPaid ? sum + inst.amount : sum, 0) || 0;
                                        const balance = res.finalPrice - paidAmount;
                                        const paymentColor = getPaymentColor(res.finalPrice, balance);
                                        return (
                                            <div key={res.id} className="p-2 border rounded bg-background flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                                                <div className="flex items-center gap-2">
                                                    <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${paymentColor}`}></div>
                                                    <p className="font-semibold text-sm flex items-center gap-1"><User className="w-3 h-3"/>{res.passenger}</p>
                                                    <Badge variant="secondary">{res.paxCount} pax</Badge>
                                                </div>
                                                <div className="text-xs text-muted-foreground flex items-center gap-1"><CreditCard className="w-3 h-3"/> {res.paymentStatus}</div>
                                                <div className="text-xs font-mono flex items-center gap-1"><DollarSign className="w-3 h-3"/> ${res.finalPrice.toLocaleString()}</div>
                                                <Button variant="outline" size="sm" className="h-7 text-xs self-end md:self-center">Gestionar</Button>
                                            </div>
                                        )
                                    })}
                                </div>
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

// Helper to format date if it's not already in use-memo
const format = (date: Date, formatString: string): string => {
    // Simple date formatting, for more complex needs use a library like date-fns
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    // Add more formats as needed
    if (formatString === 'yyyy-MM') {
        return `${year}-${month}`;
    }
    return date.toLocaleDateString();
}

    