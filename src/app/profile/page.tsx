
"use client"

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { useAuth } from "@/components/auth/auth-provider";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import type { Passenger } from "@/lib/types";
import { isUsernameUnique, savePassenger, deleteDocument, getAllFromCollection_client } from "@/lib/firestore-services";
import { Loader2, UserCircle, Save, Users, Trash2, Edit } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { DatePicker } from "@/components/ui/date-picker";
import { PassengerForm } from "@/components/admin/passenger-form";

export default function ProfilePage() {
    const { user, loading, userRole } = useAuth();
    const router = useRouter();
    const { toast } = useToast();
    const [passenger, setPassenger] = useState<Passenger | null>(null);
    const [formData, setFormData] = useState({ username: '', fullName: '', dni: '', phone: '', email: '', dob: null as Date | null | undefined });
    const [familyMembers, setFamilyMembers] = useState<Passenger[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [isFetching, setIsFetching] = useState(true);
    const [editingMember, setEditingMember] = useState<Passenger | null>(null);

    const fetchAllData = async (currentUserId: string) => {
        setIsFetching(true);
        const allPassengers = await getAllFromCollection_client<Passenger>('passengers');
        const currentUserData = allPassengers.find(p => p.id === currentUserId);
        
        if (currentUserData) {
            const dobFromDb = currentUserData.dob as any;
            let dobDate: Date | null = null;
            if (dobFromDb && typeof dobFromDb.toDate === 'function') {
                dobDate = dobFromDb.toDate();
            } else if (dobFromDb) {
                const parsed = new Date(dobFromDb);
                if (!isNaN(parsed.getTime())) {
                    dobDate = parsed;
                }
            }


            setPassenger(currentUserData);
            setFormData({
                username: currentUserData.username || '',
                fullName: currentUserData.fullName,
                dni: currentUserData.dni || '',
                phone: currentUserData.phone || '',
                email: currentUserData.email || '',
                dob: dobDate,
            });

            if (currentUserData.family) {
                const members = allPassengers.filter(p => p.family === currentUserData.family && p.id !== currentUserData.id);
                setFamilyMembers(members);
            } else {
                setFamilyMembers([]);
            }
        } else {
            toast({ title: "Error de perfil", description: "No pudimos encontrar tu perfil. Por favor, contacta a soporte.", variant: "destructive"});
            router.replace('/login');
        }
        setIsFetching(false);
    }

    useEffect(() => {
        if (!loading) {
            if (user) {
                fetchAllData(user.id);
            } else {
                router.replace('/login');
            }
        }
    }, [user, loading, router, toast]);

    const handleFormChange = (field: keyof typeof formData, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    }

    const handleSaveChanges = async () => {
        if (!passenger) return;
        setIsSaving(true);
        
        if (formData.username && formData.username !== passenger.username) {
            const unique = await isUsernameUnique(formData.username, passenger.id);
            if (!unique) {
                toast({ title: "Nombre de usuario no disponible", description: "Por favor, elige otro.", variant: "destructive" });
                setIsSaving(false);
                return;
            }
        }

        try {
            const updatedPassengerData: Partial<Passenger> = { ...formData, dob: formData.dob || null };
            await savePassenger(updatedPassengerData, passenger.id);
            
            // If the user is also an employee, sync the data
            if (userRole === 'employee') {
                await savePassenger({ name: formData.fullName, dni: formData.dni, phone: formData.phone }, passenger.id, 'employees');
            }
            
            await fetchAllData(passenger.id);

            toast({ title: "¡Datos guardados!", description: "Tu perfil ha sido actualizado." });
        } catch (error) {
            toast({ title: "Error", description: "No se pudieron guardar los cambios.", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleRemoveMember = async (memberId: string) => {
        setIsSaving(true);
        try {
            await deleteDocument('passengers', memberId);
            await fetchAllData(user!.id);
            toast({ title: "Integrante eliminado", description: "El pasajero fue eliminado de tu grupo.", variant: "destructive" });
        } catch (error) {
            toast({ title: "Error", description: "No se pudo eliminar al integrante.", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    }
    
    const handleEditMember = (member: Passenger) => {
        setEditingMember(member);
    };

    const handleSaveMember = async (updatedMember: Passenger) => {
        try {
            // The ID is part of the updatedMember object coming from the form
            await savePassenger(updatedMember, updatedMember.id);
            await fetchAllData(user!.id);
            setEditingMember(null);
            toast({ title: "Integrante actualizado", description: "Los datos se guardaron correctamente." });
        } catch (error) {
            console.error("Error saving member:", error);
            toast({ title: "Error", description: "No se pudieron guardar los datos del integrante.", variant: "destructive" });
        }
    }


    if (loading || isFetching) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="w-12 h-12 animate-spin text-primary"/>
            </div>
        );
    }
    
    if (!passenger) {
         return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <p className="text-lg font-semibold">No se pudo cargar tu perfil.</p>
                    <Button onClick={() => router.push('/login')} className="mt-4">Volver al Login</Button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-screen">
             {editingMember && (
                <PassengerForm
                    isOpen={!!editingMember}
                    onOpenChange={() => setEditingMember(null)}
                    onSave={handleSaveMember}
                    passenger={editingMember}
                    hideBoardingPoint={true}
                />
            )}
            <SiteHeader />
            <main className="flex-1">
                <div className="container py-12 md:py-24">
                    <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                        <Card className="shadow-lg">
                            <CardHeader>
                                <div className="flex items-center gap-4">
                                    <UserCircle className="w-10 h-10 text-primary"/>
                                    <div>
                                        <CardTitle className="text-2xl">Mi Perfil</CardTitle>
                                        <CardDescription>Actualiza tu información personal.</CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2"><Label htmlFor="username">Nombre de Usuario</Label><Input id="username" value={formData.username} onChange={(e) => handleFormChange('username', e.target.value)} /></div>
                                <div className="space-y-2"><Label htmlFor="email">Email</Label><Input id="email" value={formData.email} onChange={(e) => handleFormChange('email', e.target.value)} disabled /><p className="text-xs text-muted-foreground">El email no se puede cambiar.</p></div>
                                <div className="space-y-2"><Label htmlFor="fullName">Nombre Completo</Label><Input id="fullName" value={formData.fullName} onChange={(e) => handleFormChange('fullName', e.target.value)} /></div>
                                <div className="space-y-2"><Label htmlFor="dni">DNI</Label><Input id="dni" value={formData.dni} onChange={(e) => handleFormChange('dni', e.target.value)} /></div>
                                <div className="space-y-2"><Label htmlFor="phone">Teléfono</Label><Input id="phone" value={formData.phone} onChange={(e) => handleFormChange('phone', e.target.value)} /></div>
                                <div className="space-y-2">
                                    <Label htmlFor="dob">Fecha de Nacimiento</Label>
                                    <DatePicker
                                        id="dob"
                                        date={formData.dob}
                                        setDate={(d) => handleFormChange('dob', d)}
                                        placeholder="Seleccionar fecha"
                                        captionLayout="dropdown-buttons"
                                        fromYear={new Date().getFullYear() - 100}
                                        toYear={new Date().getFullYear()}
                                    />
                                </div>
                            </CardContent>
                            <CardFooter>
                                <Button onClick={handleSaveChanges} disabled={isSaving}>
                                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4" />}
                                {isSaving ? "Guardando..." : "Guardar Cambios"}
                                </Button>
                            </CardFooter>
                        </Card>
                        
                        <Card className="shadow-lg">
                             <CardHeader>
                                <div className="flex items-center gap-4">
                                    <Users className="w-10 h-10 text-primary"/>
                                    <div>
                                        <CardTitle className="text-2xl">Mi Grupo Familiar</CardTitle>
                                        <CardDescription>Gestiona los integrantes de tu grupo.</CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                               {familyMembers.length > 0 ? (
                                   familyMembers.map(member => (
                                       <div key={member.id} className="flex items-center justify-between p-3 border rounded-lg bg-muted/50">
                                            <div>
                                                <p className="font-medium">{member.fullName}</p>
                                                <p className="text-sm text-muted-foreground">DNI: {member.dni}</p>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Button variant="ghost" size="icon" onClick={() => handleEditMember(member)} disabled={isSaving}><Edit className="w-4 h-4"/></Button>
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button variant="ghost" size="icon" disabled={isSaving}><Trash2 className="w-4 h-4 text-destructive"/></Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                                                            <AlertDialogDescription>Esta acción eliminará a {member.fullName} permanentemente. No se puede deshacer.</AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                            <AlertDialogAction onClick={() => handleRemoveMember(member.id)} className="bg-destructive hover:bg-destructive/90">Eliminar</AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </div>
                                       </div>
                                   ))
                               ) : (
                                   <p className="text-center text-muted-foreground p-4">No hay otros integrantes en tu grupo.</p>
                               )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </main>
            <SiteFooter />
        </div>
    );
}
