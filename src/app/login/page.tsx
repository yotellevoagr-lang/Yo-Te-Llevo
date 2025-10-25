
"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LogInIcon, UserPlus, Eye, EyeOff, Loader2, ArrowLeft, Shield } from "lucide-react";
import { Logo } from "@/components/logo";
import { Separator } from "@/components/ui/separator";
import type { Passenger } from "@/lib/types";
import { handleLogin, registerPassenger, isUsernameUnique, validatePassword } from "@/lib/firestore-services";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { useAuth } from "@/components/auth/auth-provider";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { signOut, sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/lib/firebase";


function UnifiedLoginForm({ prefillIdentifier }: { prefillIdentifier?: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const { login: authLogin } = useAuth(); // Use the login function from context
  const [identifier, setIdentifier] = useState(prefillIdentifier || "");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const passwordRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (prefillIdentifier) {
      setIdentifier(prefillIdentifier);
      passwordRef.current?.focus();
    }
  }, [prefillIdentifier]);

  const onLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      // Step 1: Authenticate and get user data/roles
      const { user, availableRoles, primaryRole, firebaseUser } = await handleLogin(identifier, password);
      
      // Step 2: Update the global auth state
      authLogin(user, firebaseUser, availableRoles);
      
      toast({ title: "¡Bienvenido/a!", description: "Has iniciado sesión correctamente." });
      
      // Step 3: Redirect from here, after the state is set
      if (availableRoles.length > 1) {
        router.push('/login/select-role');
      } else {
         switch (primaryRole) {
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
      }

    } catch (error: any) {
      toast({ title: "Error al iniciar sesión", description: error.message, variant: "destructive" });
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={onLogin} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="identifier">Email, DNI o Nombre de Usuario</Label>
        <Input id="identifier" value={identifier} onChange={(e) => setIdentifier(e.target.value)} placeholder="tu@email.com, DNI o nombre" required className="h-11"/>
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Contraseña</Label>
        <div className="relative">
          <Input ref={passwordRef} id="password" type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="********" required className="h-11 pr-10"/>
          <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground" aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}>
            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>
      </div>
      <Button type="submit" className="w-full h-11" disabled={isLoading}>{isLoading ? <Loader2 className="animate-spin" /> : <> <LogInIcon className="mr-2 h-4 w-4" /> Ingresar </>}</Button>
    </form>
  );
}

function PassengerRegisterForm({ onExistingUser, setActiveTab }: { onExistingUser: (email: string) => void, setActiveTab: (tab: string) => void }) {
    const router = useRouter();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [formData, setFormData] = useState({ username: '', fullName: '', email: '', password: '' });
    const [usernameError, setUsernameError] = useState('');
    const [usernameSuggestions, setUsernameSuggestions] = useState<string[]>([]);
    const [passwordError, setPasswordError] = useState('');

    const handleFormChange = (field: keyof typeof formData, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        if (field === 'username') {
            setUsernameError('');
            setUsernameSuggestions([]);
        }
    };
    
    const handlePasswordChange = (value: string) => {
        handleFormChange('password', value);
        setPasswordError(validatePassword(value) || '');
    }

    const onRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        const isUnique = await isUsernameUnique(formData.username);
        if (!isUnique) {
            setUsernameError('Este nombre de usuario ya está en uso.');
            const suggestions = await Promise.all([
                isUsernameUnique(formData.username + '123'),
                isUsernameUnique(formData.username + new Date().getFullYear().toString().slice(-2)),
            ]).then(results => [
                results[0] ? formData.username + '123' : null,
                results[1] ? formData.username + new Date().getFullYear().toString().slice(-2) : null
            ].filter(Boolean) as string[]);
            setUsernameSuggestions(suggestions);
            setIsLoading(false);
            return;
        }
        
        try {
            await registerPassenger(formData);
            toast({
                title: "¡Registro Exitoso!",
                description: "Tu cuenta ha sido creada. Ahora inicia sesión.",
                variant: "default",
            });
            onExistingUser(formData.email);
            setActiveTab('login');
        } catch (error: any) {
            if (error.message.includes("Este correo electrónico ya está registrado") || error.code === 'auth/email-already-in-use') {
                toast({
                  title: "Este correo ya está registrado",
                  description: "Intenta iniciar sesión o usa otro correo.",
                  variant: "destructive",
                  action: <Button variant="ghost" onClick={() => {
                      onExistingUser(formData.email);
                      setActiveTab('login');
                  }}>¿Quieres iniciar sesión?</Button>
                });
            } else {
                toast({ title: "Error de registro", description: error.message, variant: "destructive" });
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <form onSubmit={onRegister} className="space-y-4">
             <div className="space-y-2">
                <Label htmlFor="register-username">Nombre de Usuario</Label>
                <Input 
                    id="register-username" 
                    placeholder="Elige un nombre de usuario" 
                    required 
                    className={cn("h-11", usernameError && "border-destructive focus-visible:ring-destructive")} 
                    value={formData.username} 
                    onChange={e => handleFormChange('username', e.target.value)}
                />
                {usernameError && (
                    <div className="text-sm text-destructive">
                        <p>{usernameError}</p>
                        {usernameSuggestions.length > 0 && (
                            <p className="text-xs">Sugerencias: {usernameSuggestions.join(', ')}</p>
                        )}
                    </div>
                )}
             </div>
             <div className="space-y-2"><Label htmlFor="register-name">Nombre Completo</Label><Input id="register-name" placeholder="Ej: Juan Pérez" required className="h-11" value={formData.fullName} onChange={e => handleFormChange('fullName', e.target.value)}/></div>
             <div className="space-y-2"><Label htmlFor="register-email">Email</Label><Input id="register-email" type="email" placeholder="tu@email.com" required className="h-11" value={formData.email} onChange={e => handleFormChange('email', e.target.value)}/></div>
            <div className="space-y-2">
                <Label htmlFor="register-password">Contraseña</Label>
                <div className="relative">
                    <Input 
                        id="register-password" 
                        type={showPassword ? "text" : "password"} 
                        placeholder="Crea una contraseña segura" 
                        required 
                        className={cn("h-11 pr-10", passwordError && "border-destructive focus-visible:ring-destructive")} 
                        value={formData.password} 
                        onChange={e => handlePasswordChange(e.target.value)}
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground" aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}>
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                </div>
                {passwordError && <p className="text-sm text-destructive">{passwordError}</p>}
                {!passwordError && formData.password && <p className="text-xs text-muted-foreground">La contraseña debe tener al menos 8 caracteres, mayúsculas, minúsculas, números y símbolos.</p>}
            </div>
             <Button type="submit" className="w-full h-11" disabled={isLoading || !!usernameError || !!passwordError}>
                {isLoading ? <Loader2 className="animate-spin" /> : <> <UserPlus className="mr-2 h-4 w-4" /> Registrarse </>}
             </Button>
        </form>
    )
}

function ForgotPasswordDialog() {
    const { toast } = useToast();
    const [email, setEmail] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const handlePasswordReset = async () => {
        if (!email) {
            toast({ title: "Falta el email", description: "Por favor, ingresa tu correo electrónico.", variant: "destructive" });
            return;
        }
        setIsLoading(true);
        try {
            await sendPasswordResetEmail(auth, email);
            toast({ title: "Correo Enviado", description: "Revisa tu bandeja de entrada para restablecer tu contraseña." });
        } catch (error: any) {
            toast({ title: "Error", description: "No se pudo enviar el correo. Verifica que el email sea correcto.", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    }

    return (
         <DialogContent>
            <DialogHeader>
                <DialogTitle>Recuperar Contraseña</DialogTitle>
                <DialogDescription>
                    Ingresa tu correo electrónico y te enviaremos un enlace para que puedas restablecer tu contraseña.
                </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-2">
                <Label htmlFor="reset-email">Email</Label>
                <Input id="reset-email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@email.com"/>
            </div>
            <DialogFooter>
                 <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
                <Button onClick={handlePasswordReset} disabled={isLoading}>
                    {isLoading ? <Loader2 className="animate-spin" /> : "Enviar Correo"}
                </Button>
            </DialogFooter>
        </DialogContent>
    )
}

function AuthPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [activeTab, setActiveTab] = useState(searchParams.get('mode') || 'login');
  const [prefillIdentifier, setPrefillIdentifier] = useState('');


  const handleExistingUser = (email: string) => {
    setPrefillIdentifier(email);
  };
  

  return (
    <Dialog>
    <div className="flex flex-col items-center justify-center min-h-screen bg-muted/40 p-4">
       <div className="w-full max-w-sm">
            <div className="flex justify-start items-center mb-4">
                <Button variant="ghost" onClick={() => router.push('/')}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Volver al Inicio
                </Button>
            </div>
            <Card className="shadow-2xl">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4"><Logo /></div>
                    <CardTitle className="text-2xl font-headline">Acceso</CardTitle>
                    <CardDescription>Ingresa a tu cuenta o regístrate para la mejor experiencia.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                           <TabsTrigger value="login">Iniciar Sesión</TabsTrigger>
                           <TabsTrigger value="register">Registro</TabsTrigger>
                        </TabsList>

                        <TabsContent value="login">
                           <UnifiedLoginForm prefillIdentifier={prefillIdentifier} />
                            <DialogTrigger asChild>
                               <Button variant="link" className="w-full mt-2 text-xs">¿Olvidaste tu contraseña?</Button>
                           </DialogTrigger>
                        </TabsContent>
                       <TabsContent value="register">
                           <PassengerRegisterForm onExistingUser={handleExistingUser} setActiveTab={setActiveTab} />
                       </TabsContent>
                    </Tabs>
                </CardContent>
                <CardFooter className="flex-col items-center gap-4 pt-6">
                     <p className="text-xs text-muted-foreground text-center">Al continuar, aceptas nuestros Términos de Servicio y Política de Privacidad.</p>
                </CardFooter>
            </Card>
        </div>
    </div>
    <ForgotPasswordDialog />
    </Dialog>
  );
}


export default function AuthPage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="w-12 h-12 animate-spin text-primary"/></div>}>
            <AuthPageContent />
        </Suspense>
    )
}
