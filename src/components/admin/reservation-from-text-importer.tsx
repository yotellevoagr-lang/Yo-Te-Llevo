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
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Loader2, CheckCircle, Wand2, Info, UserPlus, AlertTriangle, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { processReservationText, ProcessedReservationOutput } from "@/ai/flows/create-reservation-from-text-flow";
import type { Tour, Passenger, Reservation, BoardingPoint } from "@/lib/types";
import { getAllFromCollection, savePassenger, saveReservation, getAllFromCollection_client } from "@/lib/firestore-services";
import { PassengerForm } from "./passenger-form";

interface ReservationFromTextImporterProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onReservationCreated?: () => void;
}

const PLACEHOLDER_TEXT = `Ejemplos de lo que podés pegar:

• "Hola! Soy María González, DNI 27654321, quiero reservar 2 lugares. Tel 341-5551234. Viajamos con mi marido Rodrigo Pérez DNI 30123456"

• "buenas para el viaje del viernes me anota 1 lugar, juan perez 30555444 fecha nac 12/5/1988 embarco desde terminal rosario"

• "necesito 3 lugares para la familia, embarco desde plaza principal"

No importa el orden ni si faltan datos — la IA extrae lo que puede.`;

const CONFIDENCE_LABELS: Record<string, { label: string; color: string }> = {
  high: { label: "Alta confianza", color: "bg-green-100 text-green-700" },
  medium: { label: "Confianza media", color: "bg-yellow-100 text-yellow-700" },
  low: { label: "Baja confianza", color: "bg-red-100 text-red-700" },
};

export function ReservationFromTextImporter({ isOpen, onOpenChange, onReservationCreated }: ReservationFromTextImporterProps) {
    const { toast } = useToast();
    const [text, setText] = useState("");
    const [tours, setTours] = useState<Tour[]>([]);
    const [boardingPoints, setBoardingPoints] = useState<BoardingPoint[]>([]);
    const [selectedTripId, setSelectedTripId] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [processedData, setProcessedData] = useState<ProcessedReservationOutput | null>(null);
    const [isConfirming, setIsConfirming] = useState(false);
    const [isPassengerFormOpen, setIsPassengerFormOpen] = useState(false);

    useEffect(() => {
        if (isOpen) {
            const fetchData = async () => {
                const [toursData, bpData] = await Promise.all([
                    getAllFromCollection<Tour>('tours'),
                    getAllFromCollection_client<BoardingPoint>('boarding_points'),
                ]);
                const activeTours = toursData.filter(t => new Date(t.date) >= new Date());
                setTours(activeTours);
                setBoardingPoints(bpData);
            };
            fetchData();
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
            toast({ title: "Error de la IA", description: "No se pudo procesar el texto. Intenta de nuevo.", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateReservation = async () => {
        if (!processedData || !selectedTripId) return;
        setIsConfirming(true);
        try {
            const allPassengers = await getAllFromCollection<Passenger>('passengers');
            const tour = tours.find(t => t.id === selectedTripId);
            if (!tour) throw new Error("Viaje no encontrado");

            // --- Main passenger ---
            let mainPassenger = allPassengers.find(p => p.dni === processedData.passenger.dni && processedData.passenger.dni);
            let mainExisted = !!mainPassenger;

            if (!mainPassenger) {
                mainPassenger = {
                    id: `P-${Date.now()}`,
                    fullName: processedData.passenger.fullName,
                    dni: processedData.passenger.dni,
                    phone: processedData.passenger.phone,
                    dob: processedData.passenger.dob ? new Date(processedData.passenger.dob) : null,
                    nationality: "Argentina",
                    tierId: "adult",
                };
            } else {
                mainPassenger = {
                    ...mainPassenger,
                    fullName: processedData.passenger.fullName || mainPassenger.fullName,
                    phone: processedData.passenger.phone || mainPassenger.phone,
                    dob: processedData.passenger.dob ? new Date(processedData.passenger.dob) : (mainPassenger.dob || null),
                };
            }

            // Resolve boarding point from name if provided
            if (processedData.reservation.boardingPointName && !mainPassenger.boardingPointId) {
                const matchedBP = boardingPoints.find(bp =>
                    bp.name.toLowerCase().includes(processedData.reservation.boardingPointName!.toLowerCase()) ||
                    processedData.reservation.boardingPointName!.toLowerCase().includes(bp.name.toLowerCase())
                );
                if (matchedBP) {
                    mainPassenger = { ...mainPassenger, boardingPointId: matchedBP.id };
                }
            }

            await savePassenger(mainPassenger);
            const passengerIds = [mainPassenger.id];

            // --- Additional passengers ---
            const addlPassengers = processedData.additionalPassengers || [];
            for (const addlData of addlPassengers) {
                let addlP = allPassengers.find(p => p.dni === addlData.dni && addlData.dni);
                if (!addlP) {
                    addlP = {
                        id: `P-${Date.now()}-${Math.random().toString(36).slice(2)}`,
                        fullName: addlData.fullName,
                        dni: addlData.dni,
                        phone: addlData.phone,
                        dob: addlData.dob ? new Date(addlData.dob) : null,
                        nationality: "Argentina",
                        tierId: "adult",
                    };
                } else {
                    addlP = {
                        ...addlP,
                        fullName: addlData.fullName || addlP.fullName,
                    };
                }
                await savePassenger(addlP);
                passengerIds.push(addlP.id);
            }

            const newReservation: Reservation = {
                id: `R-AI-${Date.now()}`,
                tripId: selectedTripId,
                passenger: mainPassenger.fullName,
                passengerIds,
                paxCount: processedData.reservation.paxCount,
                finalPrice: processedData.reservation.finalPrice || (tour.price * processedData.reservation.paxCount),
                status: 'Pendiente',
                paymentStatus: 'Pendiente',
                sellerId: 'unassigned',
                assignedSeats: [],
                assignedCabins: [],
            };

            await saveReservation(newReservation);

            const newCount = addlPassengers.length;
            toast({
                title: "¡Reserva Creada Exitosamente!",
                description: `${mainExisted ? 'Pasajero actualizado' : 'Nuevo pasajero creado'}${newCount > 0 ? ` + ${newCount} pasajero(s) adicional(es)` : ''}. Reserva guardada para ${mainPassenger.fullName}.`
            });

            onReservationCreated?.();
            onOpenChange(false);

        } catch (error) {
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
                ...processedData.passenger,
                fullName: updatedPassenger.fullName,
                dni: updatedPassenger.dni,
                phone: updatedPassenger.phone,
                dob: updatedPassenger.dob instanceof Date ? updatedPassenger.dob.toISOString().split('T')[0] : undefined,
            }
        });
        setIsPassengerFormOpen(false);
    }

    const confidenceInfo = processedData ? CONFIDENCE_LABELS[processedData.confidence] : null;

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
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Wand2 className="h-5 w-5 text-primary" />
                        Crear Reserva desde WhatsApp (IA)
                    </DialogTitle>
                    <DialogDescription>
                        Pegá los mensajes de la conversación y la IA extrae los datos automáticamente.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    {/* Info box con datos esperados */}
                    <Alert>
                        <Info className="h-4 w-4" />
                        <AlertTitle>¿Qué datos puede detectar la IA?</AlertTitle>
                        <AlertDescription>
                            <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs mt-1">
                                <span>✓ Nombre completo del pasajero</span>
                                <span>✓ DNI (limpia puntos y espacios)</span>
                                <span>✓ Teléfono de contacto</span>
                                <span>✓ Fecha de nacimiento</span>
                                <span>✓ Pasajeros adicionales (familia)</span>
                                <span>✓ Cantidad de lugares</span>
                                <span>✓ Precio acordado</span>
                                <span>✓ Punto de embarque</span>
                                <span>✓ Email</span>
                                <span>✓ Ciudad de origen</span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-2">No es necesario que estén todos los datos. Lo que no se encuentre quedará vacío para completar después.</p>
                        </AlertDescription>
                    </Alert>

                    <div className="space-y-2">
                        <Label htmlFor="trip-select">1. Seleccioná el Viaje</Label>
                        <Select value={selectedTripId} onValueChange={setSelectedTripId}>
                            <SelectTrigger id="trip-select"><SelectValue placeholder="Elegir viaje..." /></SelectTrigger>
                            <SelectContent>
                                {tours.map(tour => (
                                    <SelectItem key={tour.id} value={tour.id}>
                                        {tour.destination} — {new Date(tour.date).toLocaleDateString('es-AR')}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="whatsapp-text">2. Pegá el Texto de la Conversación</Label>
                        <Textarea
                            id="whatsapp-text"
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            placeholder={PLACEHOLDER_TEXT}
                            className="h-44 text-sm"
                        />
                    </div>

                    <Button onClick={handleProcessText} disabled={isLoading || !text.trim() || !selectedTripId} className="w-full">
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                        {isLoading ? "Procesando con IA..." : "Extraer Información con IA"}
                    </Button>

                    {processedData && (
                        <div className="space-y-3">
                            <Separator />
                            {/* Confidence + missing fields */}
                            <div className="flex items-center gap-2 flex-wrap">
                                {confidenceInfo && (
                                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${confidenceInfo.color}`}>
                                        {confidenceInfo.label}
                                    </span>
                                )}
                                {(processedData.missingFields || []).map(f => (
                                    <span key={f} className="text-xs px-2 py-1 rounded-full bg-orange-50 text-orange-600 flex items-center gap-1">
                                        <AlertTriangle className="h-2.5 w-2.5" /> Sin {f}
                                    </span>
                                ))}
                            </div>

                            <Alert>
                                <CheckCircle className="h-4 w-4 text-green-600" />
                                <AlertTitle className="flex justify-between items-center">
                                    ¡Datos Extraídos!
                                    <Button variant="outline" size="sm" onClick={openPassengerFormForEdit} className="text-xs">
                                        <UserPlus className="mr-1 h-3 w-3" /> Editar Principal
                                    </Button>
                                </AlertTitle>
                                <AlertDescription>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-0.5 text-sm mt-2">
                                        <p className="col-span-full font-semibold text-xs text-muted-foreground uppercase tracking-wide mb-1">Pasajero Principal</p>
                                        <p><span className="text-muted-foreground">Nombre:</span> {processedData.passenger.fullName || <span className="text-orange-500 italic">No encontrado</span>}</p>
                                        <p><span className="text-muted-foreground">DNI:</span> {processedData.passenger.dni || <span className="text-orange-500 italic">No encontrado</span>}</p>
                                        <p><span className="text-muted-foreground">Teléfono:</span> {processedData.passenger.phone || <span className="italic text-muted-foreground">—</span>}</p>
                                        <p><span className="text-muted-foreground">F. Nac.:</span> {processedData.passenger.dob || <span className="italic text-muted-foreground">—</span>}</p>
                                        {processedData.passenger.email && <p><span className="text-muted-foreground">Email:</span> {processedData.passenger.email}</p>}
                                        {processedData.passenger.city && <p><span className="text-muted-foreground">Ciudad:</span> {processedData.passenger.city}</p>}
                                    </div>

                                    {processedData.additionalPassengers && processedData.additionalPassengers.length > 0 && (
                                        <>
                                            <Separator className="my-2" />
                                            <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold mb-1 flex items-center gap-1">
                                                <Users className="h-3 w-3" /> Pasajeros Adicionales ({processedData.additionalPassengers.length})
                                            </p>
                                            {processedData.additionalPassengers.map((p, i) => (
                                                <div key={i} className="text-sm flex gap-4 py-0.5">
                                                    <span>{p.fullName}</span>
                                                    {p.dni && <span className="text-muted-foreground">DNI: {p.dni}</span>}
                                                    {p.dob && <span className="text-muted-foreground">Nac: {p.dob}</span>}
                                                </div>
                                            ))}
                                        </>
                                    )}

                                    <Separator className="my-2" />
                                    <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold mb-1">Reserva</p>
                                    <div className="grid grid-cols-2 gap-x-6 text-sm">
                                        <p><span className="text-muted-foreground">Pasajeros:</span> {processedData.reservation.paxCount}</p>
                                        <p><span className="text-muted-foreground">Precio:</span> {processedData.reservation.finalPrice ? `$${processedData.reservation.finalPrice.toLocaleString('es-AR')}` : <span className="italic text-muted-foreground">No encontrado</span>}</p>
                                        {processedData.reservation.boardingPointName && (
                                            <p className="col-span-full"><span className="text-muted-foreground">Embarque:</span> {processedData.reservation.boardingPointName}</p>
                                        )}
                                        {processedData.reservation.observations && (
                                            <p className="col-span-full"><span className="text-muted-foreground">Notas:</span> {processedData.reservation.observations}</p>
                                        )}
                                    </div>
                                </AlertDescription>
                            </Alert>
                        </div>
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
