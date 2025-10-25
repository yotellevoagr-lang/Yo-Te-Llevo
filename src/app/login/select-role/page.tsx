"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, User, UserCog, Building, ArrowRight } from 'lucide-react';
import { useAuth } from '@/components/auth/auth-provider';

type UserRole = 'admin' | 'client' | 'employee';

const roleDetails = {
    admin: { icon: UserCog, label: "Panel de Administrador" },
    employee: { icon: Building, label: "Panel de Empleado" },
    client: { icon: User, label: "Mi Cuenta (Cliente)" },
};

export default function SelectRolePage() {
    const router = useRouter();
    const { firebaseUser, loading } = useAuth();
    const [availableRoles, setAvailableRoles] = useState<UserRole[]>([]);

    useEffect(() => {
        if (!loading) {
            const rolesStr = localStorage.getItem('ytl_available_roles');
            const roles = rolesStr ? JSON.parse(rolesStr) : [];
            
            if (!firebaseUser || roles.length <= 1) {
                // If not logged in, or only one role, redirect away
                router.replace('/');
            } else {
                setAvailableRoles(roles);
            }
        }
    }, [firebaseUser, loading, router]);
    
    const handleRoleSelect = (role: UserRole) => {
        localStorage.setItem('ytl_auth_role', role);
        window.dispatchEvent(new Event("storage")); // Notify other tabs/components
        
        switch (role) {
            case 'admin':
                router.push('/admin/dashboard');
                break;
            case 'employee':
                router.push('/employee/dashboard');
                break;
            case 'client':
                router.push('/');
                break;
            default:
                router.push('/');
        }
    };
    
    if (loading || availableRoles.length === 0) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="w-12 h-12 animate-spin text-primary" />
            </div>
        );
    }
    
    return (
        <div className="flex items-center justify-center min-h-screen bg-muted/40 p-4">
            <Card className="w-full max-w-md shadow-2xl">
                <CardHeader className="text-center">
                    <CardTitle className="text-2xl font-headline">Selecciona tu Panel</CardTitle>
                    <CardDescription>Hemos detectado que tienes varios perfiles. ¿A cuál quieres ingresar?</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {availableRoles.map(role => {
                        const details = roleDetails[role];
                        const Icon = details.icon;
                        return (
                           <Button 
                             key={role} 
                             variant="outline" 
                             className="w-full h-14 justify-between text-lg"
                             onClick={() => handleRoleSelect(role)}
                           >
                                <div className="flex items-center gap-3">
                                   <Icon className="w-6 h-6 text-primary"/>
                                   <span>{details.label}</span>
                                </div>
                               <ArrowRight className="w-5 h-5"/>
                           </Button>
                        )
                    })}
                </CardContent>
            </Card>
        </div>
    )
}
