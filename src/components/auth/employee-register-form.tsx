
"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus, Eye, EyeOff, Loader2 } from "lucide-react";
import { validatePassword, isUsernameUnique, handleEmployeeRegistration, getDocumentById } from "@/lib/firestore-services";
import { useAuth } from "./auth-provider";
import { cn } from "@/lib/utils";
import type { Employee } from "@/lib/types";

export function EmployeeRegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { login } = useAuth();
  
  const [tempEmployeeData, setTempEmployeeData] = useState<Employee | null>(null);
  const [formData, setFormData] = useState({
    phone: '',
    email: '', 
    password: '', 
    username: '' 
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [passwordError, setPasswordError] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const employeeId = searchParams.get('id');
    if (!employeeId) {
        toast({ title: "Enlace inválido", description: "Este enlace de registro no es válido o ha expirado.", variant: "destructive" });
        setIsLoadingData(false);
        return;
    }

    const fetchTempData = async () => {
        const data = await getDocumentById<Employee>('employees', employeeId);
        if (data && !data.email) { // Ensure it's a temp record
            setTempEmployeeData(data);
            setFormData(prev => ({...prev, phone: data.phone || ''}));
        } else {
            toast({ title: "Enlace inválido", description: "Este empleado ya se ha registrado o el enlace es incorrecto.", variant: "destructive" });
        }
        setIsLoadingData(false);
    };
    fetchTempData();
  }, [searchParams, toast]);

  const handleFormChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (field === 'password') {
        setPasswordError(validatePassword(value) || '');
    }
    if (field === 'username') {
        setUsernameError('');
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tempEmployeeData || !tempEmployeeData.id) return;
    
    if (passwordError) {
        toast({ title: "Contraseña inválida", description: passwordError, variant: "destructive"});
        return;
    }

    setIsSubmitting(true);
    
    const isUnique = await isUsernameUnique(formData.username);
    if (!isUnique) {
        setUsernameError('Este nombre de usuario ya está en uso.');
        setIsSubmitting(false);
        return;
    }
    
    try {
        const registrationData = {
          tempEmployeeId: tempEmployeeData.id,
          tempEmployeeData: tempEmployeeData,
          phone: formData.phone,
          email: formData.email,
          password: formData.password,
          username: formData.username
        };

        const { user, firebaseUser, availableRoles } = await handleEmployeeRegistration(registrationData);

        login(user, firebaseUser, availableRoles);

        toast({ title: "¡Registro completado!", description: "Iniciando sesión..."});
        
        router.push('/employee/dashboard');

    } catch (error: any) {
        if (error.code === 'auth/email-already-in-use') {
            toast({ title: "Error de Registro", description: "Este correo electrónico ya está en uso por otra cuenta.", variant: "destructive" });
        } else if (error.code === 'auth/weak-password') {
            toast({ title: "Contraseña Débil", description: "La contraseña debe tener al menos 6 caracteres.", variant: "destructive" });
        } else {
            console.error("Error en el proceso de registro:", error);
            toast({ title: "Error de Registro", description: "No se pudo crear la cuenta. Por favor, inténtalo de nuevo.", variant: "destructive" });
        }
    } finally {
        setIsSubmitting(false);
    }
  }
  
  if (isLoadingData) {
      return <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin"/></div>
  }
  
  if (!tempEmployeeData) {
      return <p className="text-center text-destructive">Este enlace de registro no es válido.</p>
  }

  const showPhoneInput = !tempEmployeeData.phone;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
                <Label htmlFor="fullName">Nombre Completo</Label>
                <Input id="fullName" value={tempEmployeeData.name} disabled />
            </div>
            <div className="space-y-2">
                <Label htmlFor="dni">DNI</Label>
                <Input id="dni" value={tempEmployeeData.dni} disabled />
            </div>
        </div>
        
        {showPhoneInput && (
            <div className="space-y-2">
                <Label htmlFor="phone">Teléfono (Obligatorio)</Label>
                <Input id="phone" value={formData.phone} onChange={e => handleFormChange('phone', e.target.value)} required />
            </div>
        )}

        <div className="space-y-2">
            <Label htmlFor="username">Nombre de Usuario</Label>
            <Input 
                id="username" 
                value={formData.username} 
                onChange={e => handleFormChange('username', e.target.value)} 
                required 
                className={cn(usernameError && "border-destructive focus-visible:ring-destructive")}
            />
             {usernameError && <p className="text-sm text-destructive -mt-2">{usernameError}</p>}
        </div>
        
        <div className="space-y-2">
            <Label htmlFor="email">Tu Email</Label>
            <Input id="email" type="email" value={formData.email} onChange={e => handleFormChange('email', e.target.value)} required />
        </div>
        
        <div className="space-y-2">
            <Label htmlFor="password">Crea tu Contraseña</Label>
            <div className="relative">
                <Input 
                    id="password" 
                    type={showPassword ? "text" : "password"} 
                    value={formData.password} 
                    onChange={e => handleFormChange('password', e.target.value)} 
                    required
                    className={cn(passwordError && "border-destructive focus-visible:ring-destructive")}
                />
                 <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground">
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                 </button>
            </div>
             {passwordError && <p className="text-sm text-destructive">{passwordError}</p>}
             {!passwordError && formData.password && <p className="text-xs text-muted-foreground">Debe tener al menos 8 caracteres, mayúsculas, minúsculas, números y símbolos.</p>}
        </div>

        <Button type="submit" className="w-full" disabled={isSubmitting || !!passwordError || !!usernameError}>
             {isSubmitting ? <Loader2 className="animate-spin" /> : <> <UserPlus className="mr-2 h-4 w-4" /> Finalizar Registro </>}
        </Button>
    </form>
  );
}
