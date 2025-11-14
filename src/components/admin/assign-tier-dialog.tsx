
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
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import type { Tour, Reservation, Passenger, PricingTier } from "@/lib/types";
import { Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";


interface AssignTierDialogProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    reservation: Reservation | null;
    tour: Tour | null;
    passengers: Passenger[];
    onPassengerTierChange: (passengerIds: string[], tierId: string) => Promise<void>;
}

export function AssignTierDialog({
    isOpen,
    onOpenChange,
    reservation,
    tour,
    passengers,
    onPassengerTierChange
}: AssignTierDialogProps) {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [selectedPassengerIds, setSelectedPassengerIds] = useState<string[]>([]);
    const [selectedTierId, setSelectedTierId] = useState<string>('');

    useEffect(() => {
        if (isOpen) {
            setSelectedPassengerIds([]);
            setSelectedTierId('');
        }
    }, [isOpen]);

    if (!reservation || !tour) return null;

    const reservationPassengers = passengers.filter(p => reservation.passengerIds.includes(p.id));

    const handleApplyTier = async () => {
        if (selectedPassengerIds.length === 0 || !selectedTierId) {
            toast({ title: "Faltan datos", description: "Selecciona al menos un pasajero y una tarifa.", variant: "destructive" });
            return;
        }
        setIsLoading(true);
        try {
            await onPassengerTierChange(selectedPassengerIds, selectedTierId);
            toast({ title: "Tarifas aplicadas", description: "Los pasajeros seleccionados han sido actualizados." });
            onOpenChange(false);
        } catch (error) {
            console.error("Error applying tier:", error);
            toast({ title: "Error", description: "No se pudo aplicar la tarifa.", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    }
    
    const handleCheckboxChange = (passengerId: string, checked: boolean) => {
        setSelectedPassengerIds(prev =>
            checked ? [...prev, passengerId] : prev.filter(id => id !== passengerId)
        );
    }
    
    const handleSelectAll = () => {
        if (selectedPassengerIds.length === reservationPassengers.length) {
            setSelectedPassengerIds([]);
        } else {
            setSelectedPassengerIds(reservationPassengers.map(p => p.id));
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Asignar Tarifas a Pasajeros</DialogTitle>
                    <DialogDescription>
                        Selecciona los pasajeros y la tarifa que deseas aplicar para el viaje a {tour.destination}.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                     <div className="space-y-2 p-2 border rounded-md">
                        <div className="flex items-center justify-between pb-2 border-b">
                            <Label className="font-semibold">Pasajeros de la Reserva</Label>
                            <Button variant="link" size="sm" onClick={handleSelectAll}>
                                {selectedPassengerIds.length === reservationPassengers.length ? "Deseleccionar todos" : "Seleccionar todos"}
                            </Button>
                        </div>
                        <ScrollArea className="h-40">
                          <div className="space-y-2 p-1">
                            {reservationPassengers.map(p => {
                                const currentTier = tour.pricingTiers?.find(t => t.id === p.tierId);
                                return (
                                <div key={p.id} className="flex items-center space-x-2">
                                    <Checkbox 
                                        id={`pax-tier-${p.id}`}
                                        checked={selectedPassengerIds.includes(p.id)}
                                        onCheckedChange={(checked) => handleCheckboxChange(p.id, !!checked)}
                                    />
                                    <Label htmlFor={`pax-tier-${p.id}`} className="font-normal flex-1 cursor-pointer">
                                        {p.fullName} <span className="text-muted-foreground text-xs">({currentTier?.name || 'Adulto'})</span>
                                    </Label>
                                </div>
                                );
                            })}
                          </div>
                        </ScrollArea>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="tier-select">Tarifa a Aplicar</Label>
                        <Select value={selectedTierId} onValueChange={setSelectedTierId}>
                            <SelectTrigger id="tier-select">
                                <SelectValue placeholder="Seleccionar tarifa..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="adult">Adulto (Base)</SelectItem>
                                {tour.pricingTiers?.map(tier => (
                                    <SelectItem key={tier.id} value={tier.id}>
                                        {tier.name} (${tier.price.toLocaleString('es-AR')})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
                    <Button onClick={handleApplyTier} disabled={isLoading}>
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                        Aplicar Tarifa
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
