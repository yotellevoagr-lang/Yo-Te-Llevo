
"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { Settings as SettingsIcon, Save, Eye, EyeOff, Loader2 } from "lucide-react"
import type { Employee, Passenger } from "@/lib/types"
import { useAuth } from "@/components/auth/auth-provider"
import { savePassenger, saveDocument } from "@/lib/firestore-services"
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth"
import { auth } from "@/lib/firebase"

export default function EmployeeSettingsPage() {
    const { toast } = useToast()
    const { user, firebaseUser } = useAuth()
    const [formData, setFormData] = useState({ name: '', dni: '', phone: '' });
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);


    useEffect(() => {
        if (user) {
            const employee = user as Employee;
            setFormData({
                name: employee.name || '',
                dni: employee.dni || '',
                phone: employee.phone || ''
            });
        }
    }, [user]);

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({ ...prev, [e.target.id]: e.target.value }));
    }

    const handleSaveChanges = async () => {
        if (!user) return;
        setIsLoading(true);

        try {
            // Save to both collections
            await saveDocument('employees', { ...formData }, user.id);
            await savePassenger({ fullName: formData.name, dni: formData.dni, phone: formData.phone }, user.id);
            
            toast({ title: "¡Datos guardados!", description: "Tu información personal ha sido actualizada en ambos perfiles." });
        } catch (error) {
             toast({ title: "Error", description: "No se pudieron guardar los cambios.", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    }
    
    const handleChangePassword = async () => {
        if (!firebaseUser || !firebaseUser.email || !currentPassword || !newPassword) {
            toast({ title: "Faltan datos", description: "Completa todos los campos de contraseña.", variant: "destructive"});
            return;
        }
         if (newPassword.length < 6) {
            toast({ title: "Contraseña muy corta", description: "Debe tener al menos 6 caracteres.", variant: "destructive" });
            return;
        }

        setIsLoading(true);
        try {
            const credential = EmailAuthProvider.credential(firebaseUser.email, currentPassword);
            await reauthenticateWithCredential(firebaseUser, credential);
            await updatePassword(firebaseUser, newPassword);

            toast({ title: "Contraseña actualizada", description: "Tu contraseña ha sido cambiada exitosamente." });
            setCurrentPassword("");
            setNewPassword("");

        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "No se pudo cambiar la contraseña. Verifica tu contraseña actual.", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><SettingsIcon className="w-6 h-6"/> Mi Perfil</CardTitle>
          <CardDescription>
            Actualiza tu información personal y tu contraseña. Los cambios se reflejarán tanto en tu perfil de empleado como en tu perfil de cliente.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
            <div className="space-y-4 p-4 border rounded-lg md:max-w-lg">
                <h3 className="font-semibold text-lg">Información Personal</h3>
                <div className="space-y-2">
                    <Label htmlFor="name">Nombre Completo</Label>
                    <Input id="name" value={formData.name} onChange={handleFormChange}/>
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="dni">DNI (obligatorio)</Label>
                    <Input id="dni" value={formData.dni} onChange={handleFormChange} placeholder="Tu número de DNI sin puntos"/>
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="phone">Teléfono (obligatorio)</Label>
                    <Input id="phone" value={formData.phone} onChange={handleFormChange} placeholder="Tu número de teléfono"/>
                </div>
                <Button onClick={handleSaveChanges} disabled={isLoading}>
                   {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4" />}
                   {isLoading ? "Guardando..." : "Guardar Cambios"}
                </Button>
            </div>
            <div className="space-y-4 p-4 border rounded-lg md:max-w-lg">
                <div className="flex justify-between items-center">
                    <h3 className="font-semibold text-lg">Cambiar Contraseña</h3>
                    <Button variant="ghost" size="icon" onClick={() => setShowPassword(!showPassword)}>
                       {showPassword ? <EyeOff className="w-5 h-5"/> : <Eye className="w-5 h-5" />}
                       <span className="sr-only">Mostrar/Ocultar contraseñas</span>
                    </Button>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="current-password">Contraseña Actual</Label>
                    <Input id="current-password" type={showPassword ? "text" : "password"} value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="new-password">Nueva Contraseña</Label>
                    <Input id="new-password" type={showPassword ? "text" : "password"} value={newPassword} onChange={e => setNewPassword(e.target.value)} />
                </div>
                <Button onClick={handleChangePassword} variant="outline" disabled={isLoading}>
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4" />}
                    {isLoading ? "Cambiando..." : "Cambiar Contraseña"}
                </Button>
            </div>
        </CardContent>
      </Card>
    </div>
  )
}
