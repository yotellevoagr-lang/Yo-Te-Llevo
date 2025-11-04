
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
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from "@/components/ui/dialog"
import { PlusCircle, MoreHorizontal, Edit, Trash2, Redo, Archive, ShieldAlert, MessageSquareWarning, Trash, UserPlus, Loader2, AlertTriangle } from "lucide-react"
import type { Employee, Passenger } from "@/lib/types"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { getAllFromCollection_client, saveDocument, deleteDocument, getDocumentById } from "@/lib/firestore-services"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { SearchableSelect } from "@/components/searchable-select"
import { ScrollArea } from "@/components/ui/scroll-area"

type WarningState = {
  isOpen: boolean;
  employee: Employee | null;
  text: string;
};

type EditEmployeeState = {
    isOpen: boolean;
    employee: Employee | null;
    formData: Partial<Employee>;
}

function PromotePassengerDialog({ isOpen, onOpenChange, onPromote, passengers, employees }: { isOpen: boolean, onOpenChange: (open: boolean) => void, onPromote: (passenger: Passenger) => void, passengers: Passenger[], employees: Employee[] }) {
    const [selectedPassengerId, setSelectedPassengerId] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();

    const promotablePassengers = useMemo(() => {
        const employeeDnis = new Set(employees.map(e => e.dni));
        return passengers.filter(p => !employeeDnis.has(p.dni));
    }, [passengers, employees]);

    const passengerOptions = useMemo(() => {
        return promotablePassengers.map(p => ({
            value: p.id,
            label: `${p.fullName} (${p.dni})`,
            keywords: [p.dni]
        }));
    }, [promotablePassengers]);

    const handlePromote = async () => {
        if (!selectedPassengerId) {
            toast({ title: "Error", description: "Debes seleccionar un pasajero.", variant: "destructive" });
            return;
        }
        setIsLoading(true);
        const passengerToPromote = passengers.find(p => p.id === selectedPassengerId);
        if (passengerToPromote) {
            await onPromote(passengerToPromote);
        }
        setIsLoading(false);
        onOpenChange(false);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Promover Pasajero a Empleado</DialogTitle>
                    <DialogDescription>
                        Busca y selecciona un pasajero existente para convertirlo en empleado. Se creará un nuevo perfil de empleado con sus datos.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="passenger-select">Buscar Pasajero por Nombre o DNI</Label>
                        <SearchableSelect
                            options={passengerOptions}
                            value={selectedPassengerId}
                            onChange={setSelectedPassengerId}
                            placeholder="Buscar pasajero..."
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
                    <Button onClick={handlePromote} disabled={!selectedPassengerId || isLoading}>
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                        Convertir en Empleado
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [passengers, setPassengers] = useState<Passenger[]>([])
  const [exEmployees, setExEmployees] = useState<Employee[]>([])
  const [isPromoteDialogOpen, setIsPromoteDialogOpen] = useState(false);
  const [isArchiveOpen, setIsArchiveOpen] = useState(false)
  const [warningState, setWarningState] = useState<WarningState>({ isOpen: false, employee: null, text: "" });
  const [editState, setEditState] = useState<EditEmployeeState>({isOpen: false, employee: null, formData: {}});
  
  const { toast } = useToast();

  const fetchData = async () => {
    const [employeesData, exEmployeesData, passengersData] = await Promise.all([
        getAllFromCollection_client<Employee>('employees'),
        getAllFromCollection_client<Employee>('ex_employees'),
        getAllFromCollection_client<Passenger>('passengers'),
    ]);
    setEmployees(employeesData);
    setExEmployees(exEmployeesData);
    setPassengers(passengersData);
  }

  useEffect(() => {
    fetchData();
  }, [])
  
  const handlePromotePassenger = async (passenger: Passenger) => {
    try {
        const newEmployeeData: Omit<Employee, 'id'> = {
            name: passenger.fullName,
            dni: passenger.dni,
            phone: passenger.phone || '',
            email: passenger.email,
            username: passenger.username
        };
        
        const employeeId = passenger.id.startsWith('P-') ? undefined : passenger.id;

        await saveDocument('employees', newEmployeeData, employeeId);
        
        await fetchData();
        toast({ title: "¡Empleado Creado!", description: `${passenger.fullName} ahora es un empleado.`});
    } catch (error) {
        console.error("Error promoting passenger:", error);
        toast({ title: "Error", description: "No se pudo convertir al pasajero en empleado.", variant: "destructive" });
    }
  }

  const handleArchive = async (employeeToArchive: Employee) => {
    const employeeInDb = await getDocumentById<Employee>('employees', employeeToArchive.id);
    if (!employeeInDb) {
      toast({ title: "Error", description: "No se encontró al empleado para archivar.", variant: "destructive"});
      return;
    }
    
    await saveDocument('ex_employees', employeeInDb, employeeInDb.id);
    await deleteDocument('employees', employeeInDb.id);

    await fetchData();
    toast({ title: "Empleado/a archivado/a", description: "El empleado/a ha sido movido/a a ex-empleados." });
  }
  
  const handleReactivate = async (employeeToReactivate: Employee) => {
    await saveDocument('employees', employeeToReactivate, employeeToReactivate.id);
    await deleteDocument('ex_employees', employeeToReactivate.id);
    await fetchData();
    toast({ title: "Empleado/a reactivado/a", description: "El empleado/a ha sido movido/a a la lista de activos." });
  }

  const handlePermanentDelete = async (employeeToDelete: Employee, fromArchive: boolean = false) => {
    try {
        const collectionName = fromArchive ? 'ex_employees' : 'employees';
        await deleteDocument(collectionName, employeeToDelete.id);
        await fetchData();
        toast({ title: "Rol de Empleado Eliminado", description: "El rol de empleado ha sido revocado. El perfil de pasajero permanece.", variant: "destructive"});
        
        if (fromArchive) {
            setIsArchiveOpen(false);
        }

    } catch (error) {
        console.error("Error deleting employee permanently:", error);
        toast({ title: "Error", description: "No se pudo eliminar el rol de empleado.", variant: "destructive"});
    }
  }

  const handleOpenWarningDialog = (employee: Employee) => {
    setWarningState({ isOpen: true, employee, text: employee.warning || "" });
  }

  const handleSaveWarning = async () => {
    if (!warningState.employee) return;
    const employeeToUpdate = { ...warningState.employee, warning: warningState.text };
    await saveDocument('ex_employees', employeeToUpdate, warningState.employee.id);
    await fetchData();
    toast({ title: "Advertencia guardada." });
    setWarningState({ isOpen: false, employee: null, text: "" });
  }
  
  const handleRemoveWarning = async (employeeId: string) => {
      const employee = exEmployees.find(e => e.id === employeeId);
      if (!employee) return;
      const { warning, ...employeeWithoutWarning } = employee;
      await saveDocument('ex_employees', employeeWithoutWarning, employeeId);
      await fetchData();
      toast({ title: "Advertencia eliminada." });
  }
  
  const handleOpenEditDialog = (employee: Employee) => {
    setEditState({ isOpen: true, employee, formData: { ...employee } });
  }

  const handleEditFormChange = (field: keyof Employee, value: string) => {
    setEditState(prev => ({
        ...prev,
        formData: {
            ...prev.formData,
            [field]: value
        }
    }));
  };

  const handleSaveEdit = async () => {
    if (!editState.employee) return;
    try {
      const dataToSave = {
        ...editState.formData,
        fixedSalary: Number(editState.formData.fixedSalary) || 0,
      };
      await saveDocument('employees', dataToSave, editState.employee.id);
      await fetchData();
      toast({ title: "Empleado actualizado", description: "Los datos se han guardado correctamente." });
      setEditState({ isOpen: false, employee: null, formData: {} });
    } catch (error) {
      toast({ title: "Error", description: "No se pudieron guardar los cambios.", variant: "destructive" });
    }
  }

  return (
    <div className="space-y-6">
       <PromotePassengerDialog 
          isOpen={isPromoteDialogOpen}
          onOpenChange={setIsPromoteDialogOpen}
          onPromote={handlePromotePassenger}
          passengers={passengers}
          employees={employees}
       />
       
        <Dialog open={isArchiveOpen} onOpenChange={setIsArchiveOpen}>
            <DialogContent className="max-w-3xl">
                <DialogHeader>
                    <DialogTitle>Empleados Archivados</DialogTitle>
                    <DialogDescription>
                        Gestiona a los empleados que ya no forman parte de la empresa.
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="max-h-[60vh]">
                <div className="py-4 pr-4">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nombre</TableHead>
                                <TableHead>DNI</TableHead>
                                <TableHead>Advertencia</TableHead>
                                <TableHead className="text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {exEmployees.length === 0 ? (
                                <TableRow><TableCell colSpan={4} className="h-24 text-center">No hay empleados archivados.</TableCell></TableRow>
                            ) : (
                                exEmployees.map(employee => (
                                    <TableRow key={employee.id}>
                                        <TableCell className="font-medium flex items-center gap-2">
                                            {employee.warning && <AlertTriangle className="w-4 h-4 text-amber-500" />}
                                            {employee.name}
                                        </TableCell>
                                        <TableCell>{employee.dni}</TableCell>
                                        <TableCell className="text-xs text-muted-foreground truncate max-w-xs">{employee.warning || 'N/A'}</TableCell>
                                        <TableCell className="text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild><Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => handleReactivate(employee)}><Redo className="mr-2 h-4 w-4"/>Reactivar</DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => handleOpenWarningDialog(employee)}><MessageSquareWarning className="mr-2 h-4 w-4"/>Añadir/Editar Advertencia</DropdownMenuItem>
                                                    {employee.warning && <DropdownMenuItem onClick={() => handleRemoveWarning(employee.id)} className="text-amber-600"><Trash className="mr-2 h-4 w-4"/>Eliminar Advertencia</DropdownMenuItem>}
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem onClick={() => handlePermanentDelete(employee, true)} className="text-destructive"><ShieldAlert className="mr-2 h-4 w-4"/>Revocar Rol (Permanente)</DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
                </ScrollArea>
                 <DialogFooter>
                    <Button variant="outline" onClick={() => setIsArchiveOpen(false)}>Cerrar</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
        
        <Dialog open={warningState.isOpen} onOpenChange={(open) => !open && setWarningState({ isOpen: false, employee: null, text: "" })}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Advertencia para {warningState.employee?.name}</DialogTitle>
                    <DialogDescription>
                        Añade una nota o razón por la cual se debe tener precaución al recontratar a este empleado.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    <Textarea 
                        value={warningState.text} 
                        onChange={(e) => setWarningState(prev => ({ ...prev, text: e.target.value }))}
                        placeholder="Ej: No recontratar por ausencias injustificadas."
                        className="h-32"
                    />
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setWarningState({ isOpen: false, employee: null, text: "" })}>Cancelar</Button>
                    <Button onClick={handleSaveWarning}>Guardar Advertencia</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
        
        <Dialog open={editState.isOpen} onOpenChange={(open) => setEditState(prev => ({ ...prev, isOpen: open }))}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Editar Empleado</DialogTitle>
                    <DialogDescription>Modifica los datos de {editState.employee?.name}.</DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="edit-name">Nombre</Label>
                        <Input id="edit-name" value={editState.formData.name || ''} onChange={e => handleEditFormChange('name', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="edit-dni">DNI</Label>
                        <Input id="edit-dni" value={editState.formData.dni || ''} onChange={e => handleEditFormChange('dni', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="edit-phone">Teléfono</Label>
                        <Input id="edit-phone" value={editState.formData.phone || ''} onChange={e => handleEditFormChange('phone', e.target.value)} />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="edit-salary">Sueldo Fijo</Label>
                        <Input id="edit-salary" type="number" value={editState.formData.fixedSalary || ''} onChange={e => handleEditFormChange('fixedSalary', e.target.value)} />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setEditState(prev => ({...prev, isOpen: false}))}>Cancelar</Button>
                    <Button onClick={handleSaveEdit}>Guardar Cambios</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Gestión de Empleados</h2>
          <p className="text-muted-foreground">
            Convierte pasajeros existentes en empleados o gestiona los perfiles actuales.
          </p>
        </div>
        <div className="flex items-center gap-2 self-end sm:self-center">
            <Button variant="outline" onClick={() => setIsArchiveOpen(true)}>
                <Archive className="mr-2 h-4 w-4"/>
                Ver Archivados ({exEmployees.length})
            </Button>
            <Button onClick={() => setIsPromoteDialogOpen(true)}>
              <UserPlus className="mr-2 h-4 w-4" />
              Nuevo Empleado
            </Button>
        </div>
      </div>
      <Card>
        <CardContent className="pt-6">
          <div className="w-full overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>DNI</TableHead>
                  <TableHead>Teléfono</TableHead>
                  <TableHead>Email / Estado</TableHead>
                  <TableHead>Sueldo</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      No hay empleados registrados.
                    </TableCell>
                  </TableRow>
                ) : employees.map((employee) => (
                    <TableRow key={employee.id}>
                      <TableCell className="font-medium">{employee.name}</TableCell>
                      <TableCell>{employee.dni}</TableCell>
                      <TableCell>{employee.phone}</TableCell>
                      <TableCell>
                        {employee.email ? employee.email : (
                            <Badge variant="outline" className="text-orange-500 border-orange-500">
                                Registro de Pasajero
                            </Badge>
                        )}
                      </TableCell>
                      <TableCell>${(employee.fixedSalary || 0).toLocaleString('es-AR')}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Abrir menú</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleOpenEditDialog(employee)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleArchive(employee)} className="text-amber-600">
                              <Archive className="mr-2 h-4 w-4" />
                              Archivar
                            </DropdownMenuItem>
                             <DropdownMenuItem onClick={() => handlePermanentDelete(employee)} className="text-destructive">
                              <ShieldAlert className="mr-2 h-4 w-4" />
                              Revocar Rol
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
