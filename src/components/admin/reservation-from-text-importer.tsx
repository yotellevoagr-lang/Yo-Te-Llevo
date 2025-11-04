
"use client"

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { Loader2, CheckCircle, Wand2, Info, UserPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { processReservationText, ProcessedReservationOutput } from "@/ai/flows/create-reservation-from-text-flow";
import type { Tour, Passenger, Reservation } from "@/lib/types";
import { getAllFromCollection, savePassenger, saveReservation } from "@/lib/firestore-services";
import { PassengerForm } from "./passenger-form";

interface ReservationFromTextImporterProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export function ReservationFromTextImporter({ isOpen, onOpenChange }: ReservationFromTextImporterProps) {
    const { toast } = useToast();
    const [text, setText] = useState("");
    const [tours, setTours] = useState<Tour[]>([]);
    const [selectedTripId, setSelectedTripId] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [processedData, setProcessedData] = useState<ProcessedReservationOutput | null>(null);
    const [isConfirming, setIsConfirming] = useState(false);
    const [isPassengerFormOpen, setIsPassengerFormOpen] = useState(false);

    useEffect(() => {
        if (isOpen) {
            const fetchTours = async () => {
                const toursData = await getAllFromCollection<Tour>('tours');
                const activeTours = toursData.filter(t => new Date(t.date) >= new Date());
                setTours(activeTours);
            };
            fetchTours();
            // Reset state on open
            setText("");
            setSelectedTripId("");
            setIsLoading(false);
            setProcessedData(null);
            setIsConfirming(false);
        }
    }, [isOpen]);

    const handleProcessText = async () => {
        if (!text.trim() || !selectedTripId) {
            toast({ title: "Faltan datos", description: "Por favor, pega el texto y selecciona un viaje.", variant: "destructive" });
            return;
        }
        setIsLoading(true);
        setProcessedData(null);
        try {
            const result = await processReservationText({ text });
            setProcessedData(result);
        } catch (error) {
            console.error("Error processing text:", error);
            toast({ title: "Error de la IA", description: "No se pudo procesar el texto. Inténtalo de nuevo.", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleCreateReservation = async () => {
        if (!processedData || !selectedTripId) return;
        setIsConfirming(true);
        try {
            const allPassengers = await getAllFromCollection<Passenger>('passengers');
            let passenger = allPassengers.find(p => p.dni === processedData.passenger.dni);
            let passengerExisted = !!passenger;

            if (!passenger) {
                // Create new passenger
                passenger = {
                    id: `P-${Date.now()}`,
                    fullName: processedData.passenger.fullName,
                    dni: processedData.passenger.dni,
                    phone: processedData.passenger.phone,
                    dob: processedData.passenger.dob ? new Date(processedData.passenger.dob) : null,
                    nationality: "Argentina",
                    tierId: "adult"
                };
            } else {
                // Update existing passenger with new info if available
                passenger = {
                    ...passenger,
                    fullName: processedData.passenger.fullName || passenger.fullName,
                    phone: processedData.passenger.phone || passenger.phone,
                    dob: processedData.passenger.dob ? new Date(processedData.passenger.dob) : (passenger.dob || null),
                };
            }
            await savePassenger(passenger);
            
            const tour = tours.find(t => t.id === selectedTripId);
            if (!tour) throw new Error("Tour not found");

            const newReservation: Reservation = {
                id: `R-AI-${Date.now()}`,
                tripId: selectedTripId,
                passenger: passenger.fullName,
                passengerIds: [passenger.id],
                paxCount: processedData.reservation.paxCount,
                finalPrice: processedData.reservation.finalPrice || tour.price * processedData.reservation.paxCount,
                status: 'Pendiente',
                paymentStatus: 'Pendiente',
                sellerId: 'unassigned', // Default seller
                assignedSeats: [],
                assignedCabins: []
            };

            await saveReservation(newReservation);
            
            toast({
                title: "¡Reserva Creada Exitosamente!",
                description: `${passengerExisted ? 'Pasajero actualizado y reserva creada para' : 'Nuevo pasajero y reserva creados para'} ${passenger.fullName}.`
            });

            onOpenChange(false);

        } catch (error) {
            console.error("Error creating reservation:", error);
            toast({ title: "Error al Guardar", description: "No se pudo crear la reserva.", variant: "destructive" });
        } finally {
            setIsConfirming(false);
        }
    };
    
    const openPassengerFormForEdit = () => {
        setIsPassengerFormOpen(true);
    };

    const handlePassengerSave = async (updatedPassenger: Passenger) => {
        if (!processedData) return;
        setProcessedData({
            ...processedData,
            passenger: {
                fullName: updatedPassenger.fullName,
                dni: updatedPassenger.dni,
                phone: updatedPassenger.phone,
                dob: updatedPassenger.dob?.toISOString().split('T')[0]
            }
        });
        setIsPassengerFormOpen(false);
    }

    return (
        <>
        <PassengerForm
            isOpen={isPassengerFormOpen}
            onOpenChange={setIsPassengerFormOpen}
            onSave={handlePassengerSave}
            passenger={null}
            prefilledData={{
                name: processedData?.passenger.fullName || '',
                dni: processedData?.passenger.dni || ''
            }}
        />
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Crear Reserva desde Texto</DialogTitle>
                    <DialogDescription>
                        Pega el texto de la conversación de WhatsApp y la IA extraerá los datos para crear la reserva y el pasajero.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="trip-select">1. Selecciona el Viaje</Label>
                        <Select value={selectedTripId} onValueChange={setSelectedTripId}>
                            <SelectTrigger id="trip-select"><SelectValue placeholder="Elegir viaje..." /></SelectTrigger>
                            <SelectContent>
                                {tours.map(tour => <SelectItem key={tour.id} value={tour.id}>{tour.destination}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="whatsapp-text">2. Pega el Texto de la Conversación</Label>
                        <Textarea
                            id="whatsapp-text"
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            placeholder="Pega aquí los mensajes de WhatsApp..."
                            className="h-40"
                        />
                    </div>
                    
                    <Button onClick={handleProcessText} disabled={isLoading} className="w-full">
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                        {isLoading ? "Procesando con IA..." : "Extraer Información"}
                    </Button>
                    
                    {processedData && (
                        <Alert>
                            <CheckCircle className="h-4 w-4" />
                            <AlertTitle className="flex justify-between items-center">
                                ¡Datos Extraídos!
                                <Button variant="outline" size="sm" onClick={openPassengerFormForEdit}>
                                    <UserPlus className="mr-2 h-4 w-4" /> Editar Pasajero
                                </Button>
                            </AlertTitle>
                            <AlertDescription>
                                <p className="font-semibold mt-2">Datos del Pasajero:</p>
                                <ul className="list-disc pl-5 text-sm">
                                    <li>Nombre: {processedData.passenger.fullName}</li>
                                    <li>DNI: {processedData.passenger.dni}</li>
                                    <li>Teléfono: {processedData.passenger.phone || 'No encontrado'}</li>
                                    <li>F. Nacimiento: {processedData.passenger.dob || 'No encontrada'}</li>
                                </ul>
                                <p className="font-semibold mt-2">Datos de la Reserva:</p>
                                 <ul className="list-disc pl-5 text-sm">
                                    <li>Cantidad de Pasajeros: {processedData.reservation.paxCount}</li>
                                    <li>Precio Final: {processedData.reservation.finalPrice ? `$${processedData.reservation.finalPrice}` : 'No encontrado'}</li>
                                </ul>
                            </AlertDescription>
                        </Alert>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
                    <Button onClick={handleCreateReservation} disabled={!processedData || isConfirming}>
                         {isConfirming ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                        Confirmar y Crear Reserva
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
        </>
    );
}
