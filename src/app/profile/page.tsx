
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
import { Loader2, UserCircle, Save, Users, Trash2, Edit, MapPin, KeyRound, Eye, EyeOff } from "lucide-react";
import { linkWithCredential, EmailAuthProvider, GoogleAuthProvider } from "firebase/auth";
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
    const [formData, setFormData] = useState({ 
        username: '', fullName: '', dni: '', phone: '', email: '', dob: null as Date | null | undefined,
        province: '', city: '', street: '', addressNumber: ''
    });
    const [familyMembers, setFamilyMembers] = useState<Passenger[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [isFetching, setIsFetching] = useState(true);
    const [editingMember, setEditingMember] = useState<Passenger | null>(null);
    const [passwordForm, setPasswordForm] = useState({ password: '', confirm: '', show: false });
    const [isLinkingPassword, setIsLinkingPassword] = useState(false);
    const isGoogleOnlyUser = (firebaseUser?.providerData || []).every(p => p.providerId === 'google.com') && (firebaseUser?.providerData || []).length > 0;

    const fetchAllData = async (currentUserId: string) => {
        setIsFetching(true);
        const allPassengers = await getAllFromCollection_client<Passenger>('passengers');
        const currentUserData = allPassengers.find(p => p.id === currentUserId);
        
        if (currentUserData) {
            let dobDate: Date | null = null;
            const dobFromDb = currentUserData.dob as any;
            if (dobFromDb) {
                dobDate = dobFromDb.toDate ? dobFromDb.toDate() : new Date(dobFromDb);
            }

            setPassenger(currentUserData);
            setFormData({
                username: currentUserData.username || '',
                fullName: currentUserData.fullName,
                dni: currentUserData.dni || '',
                phone: currentUserData.phone || '',
                email: currentUserData.email || '',
                dob: dobDate,
                province: currentUserData.province || '',
                city: currentUserData.city || '',
                street: currentUserData.street || '',
                addressNumber: currentUserData.addressNumber || '',
            });

            // Show only family members that THIS user owns (familyOwner === myId)
            const myMembers = allPassengers.filter(p => p.familyOwner === currentUserId && p.id !== currentUserId);
            setFamilyMembers(myMembers);
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

    const handleLinkPassword = async () => {
        if (!firebaseUser) return;
        if (passwordForm.password.length < 8) {
            toast({ title: "Contraseña muy corta", description: "Debe tener al menos 8 caracteres.", variant: "destructive" });
            return;
        }
        if (passwordForm.password !== passwordForm.confirm) {
            toast({ title: "Las contraseñas no coinciden", variant: "destructive" });
            return;
        }
        setIsLinkingPassword(true);
        try {
            const credential = EmailAuthProvider.credential(firebaseUser.email!, passwordForm.password);
            await linkWithCredential(firebaseUser, credential);
            toast({ title: "¡Contraseña establecida!", description: "Ahora podés iniciar sesión con email y contraseña también." });
            setPasswordForm({ password: '', confirm: '', show: false });
        } catch (error: any) {
            if (error.code === 'auth/provider-already-linked') {
                toast({ title: "Ya tenés contraseña configurada", description: "Usá 'Olvidé mi contraseña' para cambiarla." });
            } else {
                toast({ title: "Error", description: "No se pudo establecer la contraseña.", variant: "destructive" });
            }
        } finally {
            setIsLinkingPassword(false);
        }
    };
    
    const handleEditMember = (member: Passenger) => {
        setEditingMember(member);
    };

    const handleSaveMember = async (updatedMember: Passenger) => {
        try {
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
        return <div className="flex items-center justify-center min-h-screen"><Loader2 className="w-12 h-12 animate-spin text-primary"/></div>;
    }
    
    if (!passenger) {
         return <div className="flex items-center justify-center min-h-screen"><div className="text-center"><p className="text-lg font-semibold">No se pudo cargar tu perfil.</p><Button onClick={() => router.push('/login')} className="mt-4">Volver al Login</Button></div></div>;
    }

    return (
        <div className="flex flex-col min-h-screen bg-muted/20">
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
            <main className="flex-1 py-12 md:py-16">
                <div className="container max-w-6xl space-y-8">
                    <div className="grid md:grid-cols-2 gap-8">
                        <Card className="shadow-lg">
                            <CardHeader><div className="flex items-center gap-4"><UserCircle className="w-10 h-10 text-primary"/><div><CardTitle className="text-2xl">Mis Datos</CardTitle><CardDescription>Actualiza tu información personal.</CardDescription></div></div></CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2"><Label htmlFor="username">Nombre de Usuario</Label><Input id="username" value={formData.username} onChange={(e) => handleFormChange('username', e.target.value)} /></div>
                                <div className="space-y-2"><Label htmlFor="email">Email</Label><Input id="email" value={formData.email} onChange={(e) => handleFormChange('email', e.target.value)} disabled /><p className="text-xs text-muted-foreground">El email no se puede cambiar.</p></div>
                                <div className="space-y-2"><Label htmlFor="fullName">Nombre Completo</Label><Input id="fullName" value={formData.fullName} onChange={(e) => handleFormChange('fullName', e.target.value)} /></div>
                                <div className="space-y-2"><Label htmlFor="dni">DNI</Label><Input id="dni" value={formData.dni} onChange={(e) => handleFormChange('dni', e.target.value)} /></div>
                                <div className="space-y-2"><Label htmlFor="phone">Teléfono</Label><Input id="phone" value={formData.phone} onChange={(e) => handleFormChange('phone', e.target.value)} /></div>
                                <div className="space-y-2"><Label htmlFor="dob">Fecha de Nacimiento</Label><DatePicker id="dob" date={formData.dob} setDate={(d) => handleFormChange('dob', d)} placeholder="Seleccionar fecha" captionLayout="dropdown-buttons" fromYear={new Date().getFullYear() - 100} toYear={new Date().getFullYear()} /></div>
                            </CardContent>
                        </Card>
                        
                        <div className="space-y-8">
                             <Card className="shadow-lg">
                                <CardHeader><div className="flex items-center gap-4"><MapPin className="w-10 h-10 text-primary"/><div><CardTitle className="text-2xl">Mi Dirección</CardTitle><CardDescription>Ingresa tu dirección (opcional).</CardDescription></div></div></CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2"><Label htmlFor="province">Provincia</Label><Input id="province" value={formData.province} onChange={(e) => handleFormChange('province', e.target.value)} /></div>
                                        <div className="space-y-2"><Label htmlFor="city">Localidad</Label><Input id="city" value={formData.city} onChange={(e) => handleFormChange('city', e.target.value)} /></div>
                                    </div>
                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="space-y-2 col-span-2"><Label htmlFor="street">Calle</Label><Input id="street" value={formData.street} onChange={(e) => handleFormChange('street', e.target.value)} /></div>
                                        <div className="space-y-2"><Label htmlFor="addressNumber">Número</Label><Input id="addressNumber" value={formData.addressNumber} onChange={(e) => handleFormChange('addressNumber', e.target.value)} /></div>
                                    </div>
                                </CardContent>
                            </Card>

                            {isGoogleOnlyUser && (
                                <Card className="shadow-lg border-primary/30">
                                    <CardHeader><div className="flex items-center gap-4"><KeyRound className="w-10 h-10 text-primary"/><div><CardTitle className="text-2xl">Establecer Contraseña</CardTitle><CardDescription>Iniciaste sesión con Google. Agregá una contraseña para ingresar también con email.</CardDescription></div></div></CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="space-y-2">
                                            <Label>Nueva Contraseña</Label>
                                            <div className="relative">
                                                <Input type={passwordForm.show ? "text" : "password"} placeholder="Mínimo 8 caracteres" value={passwordForm.password} onChange={e => setPasswordForm(p => ({...p, password: e.target.value}))} className="pr-10" />
                                                <button type="button" onClick={() => setPasswordForm(p => ({...p, show: !p.show}))} className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground">
                                                    {passwordForm.show ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}
                                                </button>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Confirmar Contraseña</Label>
                                            <Input type={passwordForm.show ? "text" : "password"} placeholder="Repetí la contraseña" value={passwordForm.confirm} onChange={e => setPasswordForm(p => ({...p, confirm: e.target.value}))} />
                                        </div>
                                        <Button onClick={handleLinkPassword} disabled={isLinkingPassword || !passwordForm.password} className="w-full">
                                            {isLinkingPassword ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <KeyRound className="mr-2 h-4 w-4"/>}
                                            Establecer Contraseña
                                        </Button>
                                    </CardContent>
                                </Card>
                            )}

                            <Card className="shadow-lg">
                                <CardHeader><div className="flex items-center gap-4"><Users className="w-10 h-10 text-primary"/><div><CardTitle className="text-2xl">Mi Grupo Familiar</CardTitle><CardDescription>Gestiona los integrantes de tu grupo.</CardDescription></div></div></CardHeader>
                                <CardContent className="space-y-4">
                                {familyMembers.length > 0 ? (
                                    familyMembers.map(member => (
                                        <div key={member.id} className="flex items-center justify-between p-3 border rounded-lg bg-muted/50">
                                            <div><p className="font-medium">{member.fullName}</p><p className="text-sm text-muted-foreground">DNI: {member.dni}</p></div>
                                            <div className="flex items-center gap-1">
                                                <Button variant="ghost" size="icon" onClick={() => handleEditMember(member)} disabled={isSaving}><Edit className="w-4 h-4"/></Button>
                                                <AlertDialog><AlertDialogTrigger asChild><Button variant="ghost" size="icon" disabled={isSaving}><Trash2 className="w-4 h-4 text-destructive"/></Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>¿Estás seguro?</AlertDialogTitle><AlertDialogDescription>Esta acción eliminará a {member.fullName} permanentemente. No se puede deshacer.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => handleRemoveMember(member.id)} className="bg-destructive hover:bg-destructive/90">Eliminar</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
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
                     <div className="flex justify-center mt-8">
                        <Button size="lg" onClick={handleSaveChanges} disabled={isSaving} className="w-full max-w-xs">
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4" />}
                        {isSaving ? "Guardando..." : "Guardar Todos los Cambios"}
                        </Button>
                    </div>
                </div>
            </main>
            <SiteFooter />
        </div>
    );
}
