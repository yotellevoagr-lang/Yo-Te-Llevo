
"use client";

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, User, UserCog, Building, ArrowRight, ShieldQuestion } from 'lucide-react';
import { useAuth } from '@/components/auth/auth-provider';
import type { Passenger, Employee } from '@/lib/types';

type UserRole = 'admin' | 'client' | 'employee';
type ProfileToSelect = { user: Passenger | Employee; role: UserRole };

const roleDetails: Record<UserRole, { icon: React.ElementType, label: string }> = {
    admin: { icon: UserCog, label: "Panel de Administrador" },
    employee: { icon: Building, label: "Panel de Empleado" },
    client: { icon: User, label: "Perfil de Cliente" },
};

export default function SelectRolePage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { login, loading } = useAuth();
    const [profilesToSelect, setProfilesToSelect] = useState<ProfileToSelect[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!loading) {
            const profilesStr = sessionStorage.getItem('ytl_profiles_to_select');
            const profiles = profilesStr ? JSON.parse(profilesStr) : [];
            
            if (profiles.length <= 1) {
                // If no profiles to select, redirect away
                router.replace('/');
            } else {
                setProfilesToSelect(profiles);
            }
            setIsLoading(false);
        }
    }, [loading, router]);
    
    const handleProfileSelect = (profile: ProfileToSelect) => {
        // Here we need to "complete" the login process by setting the chosen user and role
        // For simplicity, we assume the Firebase user is already authenticated from the previous step
        // We'll just update the local state and storage
        localStorage.setItem('ytl_auth_role', profile.role);
        localStorage.setItem('ytl_user_id', profile.user.id);
        
        const allRolesForSelectedUser = profilesToSelect.filter(p => p.user.id === profile.user.id).map(p => p.role);
        localStorage.setItem('ytl_available_roles', JSON.stringify(allRolesForSelectedUser));

        sessionStorage.removeItem('ytl_profiles_to_select');
        window.dispatchEvent(new Event("storage")); // Notify other components of the final role selection

        switch (profile.role) {
            case 'admin':
                router.push('/admin/dashboard');
                break;
            case 'employee':
                router.push('/employee/dashboard');
                break;
            case 'client':
            default:
                router.push('/');
                break;
        }
    };
    
    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="w-12 h-12 animate-spin text-primary" />
            </div>
        );
    }
    
    if (profilesToSelect.length === 0) {
       return (
            <div className="flex items-center justify-center min-h-screen">
                <Card className="w-full max-w-md p-4 text-center">
                    <ShieldQuestion className="mx-auto w-12 h-12 text-muted-foreground"/>
                    <CardHeader>
                        <CardTitle>No hay perfiles para seleccionar</CardTitle>
                        <CardDescription>Redirigiendo a la página de inicio...</CardDescription>
                    </CardHeader>
                </Card>
            </div>
        );
    }
    
    return (
        <div className="flex items-center justify-center min-h-screen bg-muted/40 p-4">
            <Card className="w-full max-w-md shadow-2xl">
                <CardHeader className="text-center">
                    <CardTitle className="text-2xl font-headline">Selecciona un Perfil</CardTitle>
                    <CardDescription>Detectamos varios perfiles asociados. ¿Con cuál quieres ingresar?</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {profilesToSelect.map((profile, index) => {
                        const details = roleDetails[profile.role];
                        const Icon = details.icon;
                        const user = profile.user as Passenger; // Cast to access common properties
                        return (
                           <Button 
                             key={`${profile.user.id}-${index}`} 
                             variant="outline" 
                             className="w-full h-auto py-3 justify-between text-left"
                             onClick={() => handleProfileSelect(profile)}
                           >
                                <div className="flex items-center gap-3">
                                   <Icon className="w-6 h-6 text-primary flex-shrink-0"/>
                                   <div>
                                       <p className="font-semibold">{details.label}</p>
                                       <p className="text-sm text-muted-foreground">{user.fullName} (DNI: {user.dni})</p>
                                   </div>
                                </div>
                               <ArrowRight className="w-5 h-5 flex-shrink-0"/>
                           </Button>
                        )
                    })}
                </CardContent>
            </Card>
        </div>
    )
}
