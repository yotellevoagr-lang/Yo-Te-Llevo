
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
import { SearchableSelect } from "../searchable-select"
import { savePassenger, getAllFromCollection_client } from "@/lib/firestore-services"
import { query, collection, where, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"


interface PassengerFormProps {
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
  onSave: (passenger: Passenger) => void
  passenger: Passenger | null
  prefilledFamily?: string
  prefilledData?: { name: string; dni: string } | null;
  allPassengers?: Passenger[]
  boardingPoints?: BoardingPoint[];
  hideBoardingPoint?: boolean;
  hideFamilyInput?: boolean;
}

const defaultPassenger: Omit<Passenger, 'id' | 'tierId' | 'nationality' | 'fullName'> = {
    firstName: "",
    lastName: "",
    dni: "",
    dob: undefined,
    phone: "",
    family: "",
    boardingPointId: undefined
}

export function PassengerForm({ 
    isOpen, 
    onOpenChange, 
    onSave, 
    passenger, 
    prefilledFamily, 
    prefilledData, 
    allPassengers = [], 
    boardingPoints = [], 
    hideBoardingPoint = false,
    hideFamilyInput = false
}: PassengerFormProps) {
  const [formData, setFormData] = useState(defaultPassenger);
  const { toast } = useToast();

  const isDniUnique = async (dni: string, currentPassengerId?: string): Promise<boolean> => {
    if (!dni) return true; // Don't validate empty DNI
    const q = query(collection(db, "passengers"), where("dni", "==", dni));
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) return true;
    // If a document is found, it's only "unique" if it's the same user we are editing
    return querySnapshot.docs.every(doc => doc.id === currentPassengerId);
  };


  const existingFamiliesOptions = useMemo(() => {
    const families = new Set(allPassengers.map(p => p.family).filter(Boolean));
    return Array.from(families).map(fam => ({ value: fam, label: fam }));
  }, [allPassengers]);


  useEffect(() => {
    if (isOpen) {
        if (passenger) {
            let dobDate: Date | undefined = undefined;
            const dobFromDb = passenger.dob as any;
            if (dobFromDb) {
                if (typeof dobFromDb.toDate === 'function') {
                    dobDate = dobFromDb.toDate();
                } else if (!isNaN(new Date(dobFromDb).getTime())) {
                    dobDate = new Date(dobFromDb);
                }
            }
            
            setFormData({
                ...passenger,
                dob: dobDate
            })
        } else {
            const [firstName, ...lastNameParts] = (prefilledData?.name || '').split(' ');
            setFormData({
                ...defaultPassenger,
                family: prefilledFamily || "",
                firstName: firstName || "",
                lastName: lastNameParts.join(' ') || "",
                dni: prefilledData?.dni || "",
            })
        }
    }
  }, [passenger, isOpen, prefilledFamily, prefilledData])


  const handleFormChange = (id: keyof typeof formData, value: any) => {
    setFormData(prev => ({ ...prev, [id]: value }));
  }

  const handleSubmit = async () => {
    if (!formData.firstName || !formData.lastName || !formData.dni) {
      toast({ title: "Faltan datos", description: "Por favor, completa nombre, apellido y DNI.", variant: "destructive" });
      return;
    }
    
    const dniIsUniqueValue = await isDniUnique(formData.dni, passenger?.id);
    if (!dniIsUniqueValue) {
        toast({ title: "DNI Duplicado", description: "Este DNI ya está registrado para otro pasajero.", variant: "destructive" });
        return;
    }

    let dobValue: Date | null = null;
    if (formData.dob) {
        const parsed = new Date(formData.dob);
        if (!isNaN(parsed.getTime())) {
            dobValue = parsed;
        }
    }
    
    const familyName = formData.family || `Familia ${formData.lastName}`.trim();

    const passengerToSave: Partial<Passenger> = {
        ...formData,
        dob: dobValue,
        family: familyName,
        fullName: `${formData.firstName} ${formData.lastName}`.trim(),
    }
    
    if(passenger) {
        passengerToSave.id = passenger.id;
    }

    onSave(passengerToSave as Passenger);
  }
  
  const showFamilyInput = !prefilledFamily && (!passenger || !passenger.family) && !hideFamilyInput;

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
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="firstName">Nombre</Label>
                        <Input id="firstName" value={formData.firstName} onChange={(e) => handleFormChange('firstName', e.target.value)} />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="lastName">Apellido</Label>
                        <Input id="lastName" value={formData.lastName} onChange={(e) => handleFormChange('lastName', e.target.value)} />
                    </div>
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
                {showFamilyInput && (
                  <div className="space-y-2">
                      <Label htmlFor="family">Grupo Familiar</Label>
                      <SearchableSelect
                          options={existingFamiliesOptions}
                          value={formData.family || ''}
                          onChange={(value) => handleFormChange('family', value)}
                          placeholder="Buscar o crear familia..."
                      />
                  </div>
                )}
                {!hideBoardingPoint && (
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
                )}
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
