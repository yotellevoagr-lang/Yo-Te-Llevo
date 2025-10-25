
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
import { isUsernameUnique, savePassenger } from "@/lib/firestore-services";
import { Loader2, UserCircle, Save } from "lucide-react";

export default function ProfilePage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const { toast } = useToast();
    const [passenger, setPassenger] = useState<Passenger | null>(null);
    const [formData, setFormData] = useState({ username: '', fullName: '', dni: '', phone: '', email: '' });
    const [isSaving, setIsSaving] = useState(false);
    const [isFetching, setIsFetching] = useState(true);

    useEffect(() => {
        const fetchPassenger = () => {
            if (!user) {
                router.replace('/login');
                return;
            }
            
            setIsFetching(true);
            const currentPassenger = user as Passenger;
            
            if (currentPassenger) {
                setPassenger(currentPassenger);
                setFormData({
                    username: currentPassenger.username || '',
                    fullName: currentPassenger.fullName,
                    dni: currentPassenger.dni || '',
                    phone: currentPassenger.phone || '',
                    email: currentPassenger.email || ''
                });
            } else {
                toast({ title: "Error de perfil", description: "No pudimos encontrar tu perfil. Por favor, contacta a soporte.", variant: "destructive"});
                router.replace('/login');
            }
            setIsFetching(false);
        }
        
        if (!loading) {
            if (user) {
                fetchPassenger();
            } else {
                router.replace('/login');
            }
        }
    }, [user, loading, router, toast]);

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({ ...prev, [e.target.id]: e.target.value }));
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
            const updatedPassenger: Passenger = { ...passenger, ...formData };
            
            await savePassenger(updatedPassenger);

            setPassenger(updatedPassenger);
            toast({ title: "¡Datos guardados!", description: "Tu perfil ha sido actualizado." });
        } catch (error) {
            toast({ title: "Error", description: "No se pudieron guardar los cambios.", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

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
            <SiteHeader />
            <main className="flex-1">
                <div className="container py-12 md:py-24">
                    <Card className="max-w-2xl mx-auto shadow-lg">
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
                             <div className="space-y-2">
                                <Label htmlFor="username">Nombre de Usuario</Label>
                                <Input id="username" value={formData.username} onChange={handleFormChange} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <Input id="email" value={formData.email} onChange={handleFormChange} disabled />
                                <p className="text-xs text-muted-foreground">El email no se puede cambiar desde aquí por razones de seguridad.</p>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="fullName">Nombre Completo</Label>
                                <Input id="fullName" value={formData.fullName} onChange={handleFormChange} />
                            </div>
                             <div className="space-y-2">
                                <Label htmlFor="dni">DNI</Label>
                                <Input id="dni" value={formData.dni} onChange={handleFormChange} />
                            </div>
                             <div className="space-y-2">
                                <Label htmlFor="phone">Teléfono</Label>
                                <Input id="phone" value={formData.phone} onChange={handleFormChange} />
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Button onClick={handleSaveChanges} disabled={isSaving}>
                               {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4" />}
                               {isSaving ? "Guardando..." : "Guardar Cambios"}
                            </Button>
                        </CardFooter>
                    </Card>
                </div>
            </main>
            <SiteFooter />
        </div>
    );
}
