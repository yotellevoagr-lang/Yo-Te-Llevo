
"use client"
import { useState, useMemo, useEffect } from "react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from "@/components/ui/card"
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { Search, PlusCircle, MoreHorizontal, Edit, Trash2, UserPlus, Pencil } from "lucide-react"
import type { Passenger, Employee, BoardingPoint } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { PassengerForm } from "@/components/admin/passenger-form"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { useToast } from "@/hooks/use-toast"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { getAllFromCollection_client, savePassenger, deleteDocument } from "@/lib/firestore-services"
import { deleteUser } from "@/ai/flows/delete-user-flow"

const calculateAge = (dob: any) => {
    if (!dob) return null;
    const birthDate = dob.toDate ? dob.toDate() : new Date(dob);
    if (isNaN(birthDate.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
}

export default function PassengersPage() {
  const [passengers, setPassengers] = useState<Passenger[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [boardingPoints, setBoardingPoints] = useState<BoardingPoint[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [selectedPassenger, setSelectedPassenger] = useState<Passenger | null>(null)
  const [prefilledFamily, setPrefilledFamily] = useState<string | undefined>(undefined);
  const [passengerToDelete, setPassengerToDelete] = useState<Passenger | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const { toast } = useToast();
  
  const fetchData = async () => {
      const [passengersData, boardingPointsData, employeesData] = await Promise.all([
          getAllFromCollection_client<Passenger>('passengers'),
          getAllFromCollection_client<BoardingPoint>('boarding_points'),
          getAllFromCollection_client<Employee>('employees')
      ]);
      setPassengers(passengersData);
      setBoardingPoints(boardingPointsData);
      setEmployees(employeesData);
  }

  useEffect(() => {
    fetchData();
  }, []);

  const handleEdit = (passenger: Passenger) => {
    setSelectedPassenger(passenger)
    setPrefilledFamily(undefined);
    setIsFormOpen(true)
  }

  const handleCreate = () => {
    setSelectedPassenger(null)
    setPrefilledFamily(undefined);
    setIsFormOpen(true)
  }

  const handleCreateInFamily = (familyName: string) => {
    setSelectedPassenger(null);
    setPrefilledFamily(familyName);
    setIsFormOpen(true);
  }

  const handleSave = async (passengerData: Passenger) => {
    try {
        await savePassenger(passengerData, passengerData.id);
        await fetchData();
        window.dispatchEvent(new Event('storage'));
        toast({ title: selectedPassenger ? "Pasajero actualizado" : "Pasajero creado", description: "Los datos se guardaron correctamente." });
        setIsFormOpen(false);
    } catch (error) {
        toast({ title: "Error", description: "No se pudieron guardar los datos del pasajero.", variant: "destructive"});
    }
  }
  
  const handleDeleteClick = (passenger: Passenger) => {
    setPassengerToDelete(passenger);
    setIsDeleteDialogOpen(true);
  }

  const handleConfirmDelete = async () => {
    if (!passengerToDelete) return;
    
    try {
        try {
            await deleteUser(passengerToDelete.id);
        } catch (authError: any) {
            console.log("Auth deletion skipped or failed:", authError.message);
        }
        
        await deleteDocument('passengers', passengerToDelete.id);
        
        const employeeToDelete = employees.find(e => e.id === passengerToDelete.id);
        if (employeeToDelete) {
            await deleteDocument('employees', passengerToDelete.id);
        }

        await fetchData();
        window.dispatchEvent(new Event('storage'));
        toast({ title: "Pasajero eliminado", description: "El pasajero ha sido eliminado correctamente.", variant: "destructive" });
    } catch (error: any) {
        console.error("Error deleting passenger:", error);
        toast({ title: "Error", description: error.message || "No se pudo eliminar el pasajero.", variant: "destructive"});
    } finally {
        setIsDeleteDialogOpen(false);
        setPassengerToDelete(null);
    }
  }

  const handleFamilyNameChange = async (oldFamilyName: string, newFamilyName: string) => {
     if (!newFamilyName || oldFamilyName === newFamilyName) return;
     
     const passengersToUpdate = passengers.filter(p => p.family === oldFamilyName);
     try {
        await Promise.all(
            passengersToUpdate.map(p => savePassenger({ ...p, family: newFamilyName }))
        );
        await fetchData();
        window.dispatchEvent(new Event('storage'));
        toast({ title: "Familia actualizada", description: `El grupo '${oldFamilyName}' ahora se llama '${newFamilyName}'.` });
     } catch (error) {
         toast({ title: "Error", description: "No se pudo actualizar el nombre de la familia.", variant: "destructive"});
     }
  }
  
  const passengerCountsByDNI = useMemo(() => {
    const counts = new Map<string, number>();
    passengers.forEach(p => {
        if(p.dni) counts.set(p.dni, (counts.get(p.dni) || 0) + 1);
    });
    employees.forEach(e => {
        if(e.dni) counts.set(e.dni, (counts.get(e.dni) || 0) + 1);
    });
    return counts;
  }, [passengers, employees]);

  const passengersByFamily = useMemo(() => {
    const filtered = passengers.filter(p =>
        p.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.dni.includes(searchTerm) ||
        (p.family && p.family.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return filtered.reduce((acc, p) => {
        const familyKey = p.family || 'Pasajeros Individuales';
        if (!acc[familyKey]) {
            acc[familyKey] = [];
        }
        acc[familyKey].push(p);
        return acc;
    }, {} as Record<string, Passenger[]>);
  }, [passengers, searchTerm])

  return (
    <>
    <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Estás absolutamente seguro?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta acción no se puede deshacer. Se eliminará permanentemente al pasajero <strong>{passengerToDelete?.fullName}</strong> y su cuenta de acceso asociada.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setPassengerToDelete(null)}>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive hover:bg-destructive/90">Eliminar</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    <PassengerForm 
        isOpen={isFormOpen}
        onOpenChange={setIsFormOpen}
        onSave={handleSave}
        passenger={selectedPassenger}
        prefilledFamily={prefilledFamily}
        allPassengers={passengers}
        boardingPoints={boardingPoints}
    />
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
            <h2 className="text-2xl font-bold">Gestión de Pasajeros</h2>
            <p className="text-muted-foreground">
            Añade, busca y administra la información de todos los pasajeros.
            </p>
        </div>
         <Button onClick={handleCreate}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Nuevo Pasajero
        </Button>
      </div>
      <Card>
        <CardHeader>
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input 
                    placeholder="Buscar por nombre, DNI o familia..."
                    className="pl-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
        </CardHeader>
        <CardContent>
            <Accordion type="multiple" className="w-full" defaultValue={Object.keys(passengersByFamily)}>
                {Object.entries(passengersByFamily).map(([family, members]) => (
                    <AccordionItem value={family} key={family}>
                        <AccordionTrigger className="text-lg font-medium group hover:no-underline">
                           <div className={cn("flex items-center gap-2", family === 'Pasajeros Individuales' && "w-full")}>
                                {family === 'Pasajeros Individuales' ? (
                                    <span className="text-lg font-medium">{family}</span>
                                ) : (
                                    <Input 
                                        defaultValue={family} 
                                        onBlur={(e) => handleFamilyNameChange(family, e.target.value)}
                                        onClick={(e) => e.stopPropagation()}
                                        className="text-lg font-medium border-0 shadow-none focus-visible:ring-1 focus-visible:ring-primary p-1 h-auto"
                                    />
                                )}
                                {family !== 'Pasajeros Individuales' && <Pencil className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />}
                                <span>({members.length})</span>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent>
                             <div className="space-y-4">
                                {family !== 'Pasajeros Individuales' && (
                                    <div className="flex justify-end">
                                        <Button variant="outline" size="sm" onClick={() => handleCreateInFamily(family)}>
                                            <UserPlus className="mr-2 h-4 w-4"/>
                                            Añadir Integrante
                                        </Button>
                                    </div>
                                )}
                                <Table>
                                    <TableHeader>
                                    <TableRow>
                                        <TableHead>Nombre Completo</TableHead>
                                        <TableHead>DNI</TableHead>
                                        <TableHead>F. Nacimiento</TableHead>
                                        <TableHead>Teléfono</TableHead>
                                        <TableHead>Embarque</TableHead>
                                        <TableHead>Edad</TableHead>
                                        <TableHead className="text-right">Acciones</TableHead>
                                    </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                    {members.map((p) => {
                                        const boardingPoint = boardingPoints.find(bp => bp.id === p.boardingPointId);
                                        const dobDate = p.dob?.toDate ? p.dob.toDate() : (p.dob ? new Date(p.dob) : null);
                                        const accountCount = passengerCountsByDNI.get(p.dni) || 1;
                                        return (
                                            <TableRow key={p.id}>
                                                <TableCell className="font-medium flex items-center gap-2">
                                                    {p.fullName}
                                                    {accountCount > 1 && (
                                                        <span className="text-xs font-bold text-primary bg-primary/10 rounded-full px-2">
                                                            ({accountCount})
                                                        </span>
                                                    )}
                                                </TableCell>
                                                <TableCell>{p.dni}</TableCell>
                                                <TableCell>{dobDate ? dobDate.toLocaleDateString('es-AR') : 'N/A'}</TableCell>
                                                <TableCell>{p.phone || 'N/A'}</TableCell>
                                                <TableCell>{boardingPoint?.name || 'N/A'}</TableCell>
                                                <TableCell>{p.dob ? calculateAge(p.dob) : 'N/A'}</TableCell>
                                                <TableCell className="text-right">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" className="h-8 w-8 p-0">
                                                            <span className="sr-only">Abrir menú</span>
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuItem onClick={() => handleEdit(p)}>
                                                                <Edit className="mr-2 h-4 w-4" /> Editar
                                                            </DropdownMenuItem>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem onClick={() => handleDeleteClick(p)} className="text-destructive">
                                                                <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </TableCell>
                                            </TableRow>
                                        )
                                    })}
                                    </TableBody>
                                </Table>
                             </div>
                        </AccordionContent>
                    </AccordionItem>
                ))}
            </Accordion>
        </CardContent>
      </Card>
    </div>
    </>
  )
}
