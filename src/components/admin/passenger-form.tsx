

"use client"

import { useEffect, useState, useMemo } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { DatePicker } from "@/components/ui/date-picker"
import { useToast } from "@/hooks/use-toast"
import type { Passenger, BoardingPoint } from "@/lib/types"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"
import { ScrollArea } from "../ui/scroll-area"

interface PassengerFormProps {
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
  onSave: (passenger: Passenger) => void
  passenger: Passenger | null
  prefilledFamily?: string
  prefilledData?: { name: string; dni: string } | null;
  allPassengers?: Passenger[]
  boardingPoints?: BoardingPoint[];
}

const defaultPassenger: Omit<Passenger, 'id' | 'tierId' | 'nationality'> = {
    fullName: "",
    dni: "",
    dob: undefined,
    phone: "",
    family: "",
    boardingPointId: undefined
}

export function PassengerForm({ isOpen, onOpenChange, onSave, passenger, prefilledFamily, prefilledData, allPassengers = [], boardingPoints = [] }: PassengerFormProps) {
  const [formData, setFormData] = useState(defaultPassenger);
  const { toast } = useToast();

  const existingFamilies = useMemo(() => {
    const families = new Set(allPassengers.map(p => p.family).filter(Boolean));
    return Array.from(families);
  }, [allPassengers]);


  useEffect(() => {
    if (isOpen) {
        if (passenger) {
            setFormData({
                ...passenger,
                dob: passenger.dob ? new Date(passenger.dob) : undefined
            })
        } else {
            setFormData({
                ...defaultPassenger,
                family: prefilledFamily || "",
                fullName: prefilledData?.name || "",
                dni: prefilledData?.dni || "",
            })
        }
    }
  }, [passenger, isOpen, prefilledFamily, prefilledData])


  const handleFormChange = (id: keyof typeof formData, value: any) => {
    setFormData(prev => ({ ...prev, [id]: value }));
  }

  const handleSubmit = () => {
    if (!formData.fullName || !formData.dni) {
      toast({ title: "Faltan datos", description: "Por favor, completa el nombre completo y el DNI.", variant: "destructive" });
      return;
    }
    
    const passengerToSave: Partial<Passenger> = {
        ...formData,
    }
    
    // If it's a new passenger, we pass without an ID. The service will generate it.
    if(passenger) {
        passengerToSave.id = passenger.id;
    }

    onSave(passengerToSave as Passenger);
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg flex flex-col max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>{passenger ? "Editar Pasajero" : "Crear Nuevo Pasajero"}</DialogTitle>
          <DialogDescription>
            {passenger ? "Modifica los datos del pasajero." : "Completa los detalles para crear un nuevo pasajero."}
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-grow overflow-y-auto pr-2">
            <div className="py-4 space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="fullName">Nombre Completo</Label>
                    <Input id="fullName" value={formData.fullName} onChange={(e) => handleFormChange('fullName', e.target.value)} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="dni">DNI</Label>
                    <Input id="dni" value={formData.dni} onChange={(e) => handleFormChange('dni', e.target.value)} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="dob">Fecha de Nacimiento</Label>
                    <DatePicker 
                        id="dob" 
                        date={formData.dob ? new Date(String(formData.dob)): undefined}
                        setDate={(d) => handleFormChange('dob', d)} 
                        className="h-10 w-full" 
                        placeholder="Seleccionar fecha..."
                        captionLayout="dropdown-buttons"
                        fromYear={new Date().getFullYear() - 100}
                        toYear={new Date().getFullYear()}
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="phone">Teléfono</Label>
                    <Input id="phone" value={formData.phone || ''} onChange={(e) => handleFormChange('phone', e.target.value)} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="family">Familia</Label>
                    <div className="flex gap-2">
                        <Input id="family" value={formData.family || ''} onChange={(e) => handleFormChange('family', e.target.value)} placeholder="Ej: Pérez (Rosario) o seleccionar"/>
                        {existingFamilies.length > 0 && (
                            <Select onValueChange={(val) => handleFormChange('family', val)}>
                                <SelectTrigger className="w-[180px]">
                                    <SelectValue placeholder="Familias existentes" />
                                </SelectTrigger>
                                <SelectContent>
                                    {existingFamilies.map(fam => <SelectItem key={fam} value={fam}>{fam}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        )}
                    </div>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="boardingPointId">Punto de Embarque (por defecto)</Label>
                    <Select value={formData.boardingPointId} onValueChange={(val) => handleFormChange('boardingPointId', val === 'none' ? undefined : val)}>
                        <SelectTrigger id="boardingPointId"><SelectValue placeholder="Seleccionar embarque..."/></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">Ninguno</SelectItem>
                            {boardingPoints.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
            </div>
        </div>
        
        <DialogFooter className="mt-auto pt-4 border-t shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit}>Guardar Cambios</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
