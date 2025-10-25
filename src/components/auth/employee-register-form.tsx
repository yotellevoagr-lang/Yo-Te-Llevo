

"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus, Eye, EyeOff, Loader2 } from "lucide-react";
import type { Employee } from "@/lib/types";
import { getDocumentById, saveDocument, validatePassword, isUsernameUnique, handleLogin } from "@/lib/firestore-services";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { cn } from "@/lib/utils";
import { writeBatch, doc } from "firebase/firestore";


export function EmployeeRegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  
  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const [employeeData, setEmployeeData] = useState<Employee | null>(null);
  const [formData, setFormData] = useState({ email: '', password: '', username: '' });
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const id = searchParams.get('employeeId');
    if (!id) {
        toast({ title: "Error", description: "Falta el identificador de empleado en el enlace.", variant: "destructive" });
        setIsLoading(false);
        return;
    }
    setEmployeeId(id);

    const fetchEmployee = async () => {
        const data = await getDocumentById<Employee>('employees', id);
        if (!data) {
            toast({ title: "Error", description: "Enlace de registro inválido o expirado.", variant: "destructive" });
            setIsLoading(false);
            return;
        }
        if (data.email) {
             toast({ title: "Registro Completo", description: "Este empleado ya ha completado su registro.", variant: "default" });
             router.push('/login');
             return;
        }
        setEmployeeData(data);
        setFormData(prev => ({...prev, username: data.username || ''}));
        setIsLoading(false);
    };
    fetchEmployee();

  }, [searchParams, toast, router]);

  const handleFormChange = (field: 'email' | 'password' | 'username', value: string) => {
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
    if (!employeeId || !employeeData) return;
    
    if (passwordError) {
        toast({ title: "Contraseña inválida", description: passwordError, variant: "destructive"});
        return;
    }

    setIsSubmitting(true);
    
    const isUnique = await isUsernameUnique(formData.username, employeeId);
    if (!isUnique) {
        setUsernameError('Este nombre de usuario ya está en uso.');
        setIsSubmitting(false);
        return;
    }

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
        const authUser = userCredential.user;
        
        if (!authUser) {
            throw new Error("No se pudo obtener la autenticación del usuario.");
        }

        const updatedEmployeeData: Omit<Employee, 'id'> = {
            ...employeeData,
            email: formData.email,
            username: formData.username
        };
        
        const batch = writeBatch(db);
        const newDocRef = doc(db, 'employees', authUser.uid);
        const oldDocRef = doc(db, 'employees', employeeId);

        batch.set(newDocRef, updatedEmployeeData);
        batch.delete(oldDocRef);
        
        await batch.commit();

        toast({ title: "¡Registro completado!", description: "Ahora puedes iniciar sesión con tus nuevas credenciales."});
        router.push('/employee/register-success');

    } catch (error: any) {
         if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
            toast({ title: "Contraseña Incorrecta", description: "El correo ya está registrado pero la contraseña no es correcta. ¿Olvidaste tu contraseña?", variant: "destructive", duration: 7000, action: <Button variant="link" onClick={() => router.push('/login')}>Ir a Login</Button> });
        } else if (error.code === 'auth/email-already-in-use') {
            toast({ title: "Error", description: "Este email ya está en uso por otra cuenta. Si ya tienes una cuenta de cliente, contacta a un administrador para vincular tus perfiles.", variant: "destructive", duration: 7000 });
        } else {
            toast({ title: "Error de Registro", description: "No se pudo crear la cuenta. Inténtalo de nuevo.", variant: "destructive" });
        }
    } finally {
        setIsSubmitting(false);
    }

  }

  if (isLoading) {
     return (
      <div className="flex justify-center items-center p-10">
        <Loader2 className="w-12 h-12 animate-spin text-primary"/>
      </div>
    );
  }
  
  if (!employeeData) {
      return <p className="text-center text-destructive">No se pudo cargar la información del empleado. El enlace puede ser incorrecto.</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
        <div className="p-4 border rounded-lg bg-muted/50">
            <p className="font-semibold">{employeeData.name}</p>
            <p className="text-sm text-muted-foreground">DNI: {employeeData.dni}</p>
        </div>
        <div className="space-y-2">
            <Label htmlFor="email">Tu Email</Label>
            <Input id="email" type="email" value={formData.email} onChange={e => handleFormChange('email', e.target.value)} required />
        </div>
        <div className="space-y-2">
            <Label htmlFor="username">Nombre de Usuario</Label>
            <Input 
                id="username" 
                value={formData.username} 
                onChange={e => handleFormChange('username', e.target.value)} 
                required 
                className={cn(usernameError && "border-destructive focus-visible:ring-destructive")}
            />
            {usernameError && <p className="text-sm text-destructive">{usernameError}</p>}
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
             {!passwordError && formData.password && <p className="text-xs text-muted-foreground">La contraseña debe tener al menos 8 caracteres, mayúsculas, minúsculas, números y símbolos.</p>}
        </div>

        <Button type="submit" className="w-full" disabled={isSubmitting || !!passwordError || !!usernameError}>
             {isSubmitting ? <Loader2 className="animate-spin" /> : <> <UserPlus className="mr-2 h-4 w-4" /> Finalizar Registro </>}
        </Button>
    </form>
  );
}
