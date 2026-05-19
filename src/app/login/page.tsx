

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
import { LogInIcon, UserPlus, Eye, EyeOff, Loader2, ArrowLeft, Shield, MailCheck } from "lucide-react";
import { Logo } from "@/components/logo";
import { Separator } from "@/components/ui/separator";
import type { Passenger } from "@/lib/types";
import { handleLogin, registerPassenger, isUsernameUnique, validatePassword, resendVerificationEmail, isDniUnique, signInWithGoogle, completeGoogleRegistration } from "@/lib/firestore-services";
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
import { signOut, sendPasswordResetEmail, User as FirebaseAuthUser } from "firebase/auth";
import { auth } from "@/lib/firebase";


function UnifiedLoginForm({ prefillIdentifier }: { prefillIdentifier?: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const { login: authLogin } = useAuth(); // Use the login function from context
  const [identifier, setIdentifier] = useState(prefillIdentifier || "");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const passwordRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (prefillIdentifier) {
      setIdentifier(prefillIdentifier);
      passwordRef.current?.focus();
    }
  }, [prefillIdentifier]);

  const handleResend = async () => {
    setIsResending(true);
    try {
        await resendVerificationEmail(identifier, password);
        toast({ title: "Correo Reenviado", description: "Revisa tu bandeja de entrada para el nuevo enlace de verificación." });
    } catch (error: any) {
        toast({ title: "Error al reenviar", description: error.message, variant: "destructive" });
    } finally {
        setIsResending(false);
    }
  }

  const onLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const { user, firebaseUser, availableRoles, primaryRole, profilesToSelect } = await handleLogin(identifier, password);
      
      if (profilesToSelect && profilesToSelect.length > 1) {
          sessionStorage.setItem('ytl_profiles_to_select', JSON.stringify(profilesToSelect));
          router.push('/login/select-role');
          return;
      }
      
      authLogin(user, firebaseUser, availableRoles);
      
      toast({ title: "¡Bienvenido/a!", description: "Has iniciado sesión correctamente." });
      
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

    } catch (error: any) {
      if (error.code === 'auth/email-not-verified') {
        toast({ 
            title: "Verifica tu correo", 
            description: "Por favor, revisa tu bandeja de entrada y verifica tu dirección de correo electrónico antes de iniciar sesión.", 
            variant: "destructive", 
            duration: 9000,
            action: (
                <Button variant="secondary" onClick={handleResend} disabled={isResending}>
                    {isResending ? <Loader2 className="animate-spin" /> : "Reenviar correo"}
                </Button>
            )
        });
      } else {
        toast({ title: "Error al iniciar sesión", description: error.message, variant: "destructive" });
      }
    } finally {
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

function PassengerRegisterForm({ onExistingUser, setActiveTab, setRegistrationSuccess }: { onExistingUser: (email: string) => void, setActiveTab: (tab: string) => void, setRegistrationSuccess: (success: boolean) => void }) {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [formData, setFormData] = useState({ username: '', firstName: '', lastName: '', email: '', password: '', dni: '' });
    const [usernameError, setUsernameError] = useState('');
    const [dniError, setDniError] = useState('');
    const [usernameSuggestions, setUsernameSuggestions] = useState<string[]>([]);
    const [passwordError, setPasswordError] = useState('');

    const handleFormChange = (field: keyof typeof formData, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        if (field === 'username') {
            setUsernameError('');
            setUsernameSuggestions([]);
        }
        if (field === 'dni') {
            setDniError('');
        }
    };
    
    const handlePasswordChange = (value: string) => {
        handleFormChange('password', value);
        setPasswordError(validatePassword(value) || '');
    }

    const onRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setUsernameError('');
        setDniError('');

        const uniqueUsername = await isUsernameUnique(formData.username);
        if (!uniqueUsername) {
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
        
        const isDniAvailable = await isDniUnique(formData.dni);
        if (!isDniAvailable) {
            setDniError('Este DNI ya está registrado con una cuenta de correo electrónico. Por favor, inicia sesión.');
            setIsLoading(false);
            return;
        }
        
        try {
            await registerPassenger(formData);
            setRegistrationSuccess(true);
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
             <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label htmlFor="register-firstName">Nombre</Label><Input id="register-firstName" placeholder="Ej: Juan" required className="h-11" value={formData.firstName} onChange={e => handleFormChange('firstName', e.target.value)}/></div>
                <div className="space-y-2"><Label htmlFor="register-lastName">Apellido</Label><Input id="register-lastName" placeholder="Ej: Pérez" required className="h-11" value={formData.lastName} onChange={e => handleFormChange('lastName', e.target.value)}/></div>
             </div>
             <div className="space-y-2">
                <Label htmlFor="register-dni">DNI</Label>
                <Input 
                    id="register-dni" 
                    placeholder="Tu número de documento" 
                    required 
                    className={cn("h-11", dniError && "border-destructive focus-visible:ring-destructive")} 
                    value={formData.dni} 
                    onChange={e => handleFormChange('dni', e.target.value.replace(/\D/g, ''))}
                />
                {dniError && <p className="text-sm text-destructive -mt-2">{dniError}</p>}
                <p className="text-xs text-muted-foreground pt-1 flex items-center gap-1"><Shield className="w-3 h-3"/>Tus datos están seguros con nosotros.</p>
             </div>
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
             <Button type="submit" className="w-full h-11" disabled={isLoading || !!usernameError || !!passwordError || !!dniError}>
                {isLoading ? <Loader2 className="animate-spin" /> : <> <UserPlus className="mr-2 h-4 w-4" /> Registrarse </>}
             </Button>
        </form>
    )
}

const GOOGLE_ICON = (
    <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0" aria-hidden="true">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
);

function GoogleProfileDialog({
    open,
    firebaseUser,
    onComplete,
    onCancel,
}: {
    open: boolean;
    firebaseUser: FirebaseAuthUser | null;
    onComplete: () => void;
    onCancel: () => void;
}) {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const displayName = firebaseUser?.displayName || '';
    const nameParts = displayName.trim().split(/\s+/);
    const suggestedFirst = nameParts[0] || '';
    const suggestedLast = nameParts.slice(1).join(' ') || '';
    const suggestedUsername = displayName.toLowerCase().replace(/\s+/g, '.').replace(/[^a-z0-9.]/g, '') || '';

    const [formData, setFormData] = useState({
        username: suggestedUsername,
        firstName: suggestedFirst,
        lastName: suggestedLast,
        dni: '',
        phone: '',
    });
    const [errors, setErrors] = useState({ username: '', dni: '' });

    const handleChange = (field: keyof typeof formData, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        if (field === 'username' || field === 'dni') setErrors(prev => ({ ...prev, [field]: '' }));
    };

    const handleSubmit = async () => {
        if (!formData.username || !formData.firstName || !formData.lastName || !formData.dni) {
            toast({ title: "Completá todos los campos requeridos.", variant: "destructive" });
            return;
        }
        if (!firebaseUser) return;
        setIsLoading(true);
        try {
            await completeGoogleRegistration(firebaseUser, formData);
            onComplete();
        } catch (error: any) {
            if (error.message?.includes('usuario')) {
                setErrors(prev => ({ ...prev, username: error.message }));
            } else if (error.message?.includes('DNI')) {
                setErrors(prev => ({ ...prev, dni: error.message }));
            } else {
                toast({ title: "Error", description: error.message, variant: "destructive" });
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(v) => { if (!v && !isLoading) onCancel(); }}>
            <DialogContent className="max-w-sm">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">{GOOGLE_ICON} Completar Perfil</DialogTitle>
                    <DialogDescription>Necesitamos algunos datos adicionales para crear tu cuenta.</DialogDescription>
                </DialogHeader>
                <div className="space-y-3 py-2">
                    <div className="space-y-1">
                        <Label>Nombre de usuario *</Label>
                        <Input value={formData.username} onChange={e => handleChange('username', e.target.value.toLowerCase().replace(/[^a-z0-9._]/g, ''))} placeholder="tu.nombre" className={cn(errors.username && "border-destructive")} disabled={isLoading}/>
                        {errors.username && <p className="text-xs text-destructive">{errors.username}</p>}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <Label>Nombre *</Label>
                            <Input value={formData.firstName} onChange={e => handleChange('firstName', e.target.value)} disabled={isLoading}/>
                        </div>
                        <div className="space-y-1">
                            <Label>Apellido *</Label>
                            <Input value={formData.lastName} onChange={e => handleChange('lastName', e.target.value)} disabled={isLoading}/>
                        </div>
                    </div>
                    <div className="space-y-1">
                        <Label>DNI *</Label>
                        <Input value={formData.dni} onChange={e => handleChange('dni', e.target.value.replace(/\D/g, ''))} placeholder="Número de documento" className={cn(errors.dni && "border-destructive")} disabled={isLoading}/>
                        {errors.dni && <p className="text-xs text-destructive">{errors.dni}</p>}
                    </div>
                    <div className="space-y-1">
                        <Label>Teléfono <span className="text-muted-foreground text-xs">(opcional)</span></Label>
                        <Input value={formData.phone} onChange={e => handleChange('phone', e.target.value)} placeholder="+54 9 ..." disabled={isLoading}/>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onCancel} disabled={isLoading}>Cancelar</Button>
                    <Button onClick={handleSubmit} disabled={isLoading}>
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                        Crear Cuenta
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
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
  const { toast } = useToast();
  const { login: authLogin } = useAuth();
  
  const defaultTab = searchParams.get('verified') ? 'login' : (searchParams.get('mode') || 'login');
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [prefillIdentifier, setPrefillIdentifier] = useState(searchParams.get('email') || '');
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleProfileOpen, setGoogleProfileOpen] = useState(false);
  const [pendingGoogleUser, setPendingGoogleUser] = useState<FirebaseAuthUser | null>(null);

  const handleExistingUser = (email: string) => {
    setPrefillIdentifier(email);
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      const { isNewUser, firebaseUser, firestoreProfile, availableRoles } = await signInWithGoogle();
      if (isNewUser || !firestoreProfile) {
        setPendingGoogleUser(firebaseUser);
        setGoogleProfileOpen(true);
      } else {
        authLogin(firestoreProfile, firebaseUser, availableRoles as any[]);
        toast({ title: "¡Bienvenido/a!", description: "Iniciaste sesión con Google." });
        if (availableRoles.includes('admin')) router.push('/admin/dashboard');
        else if (availableRoles.includes('employee')) router.push('/employee/dashboard');
        else router.push('/');
      }
    } catch (error: any) {
      if (error.code !== 'auth/popup-closed-by-user' && error.code !== 'auth/cancelled-popup-request') {
        toast({ title: "Error con Google", description: "No se pudo iniciar sesión con Google. Intentá de nuevo.", variant: "destructive" });
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleGoogleProfileComplete = () => {
    setGoogleProfileOpen(false);
    setPendingGoogleUser(null);
    toast({ title: "¡Cuenta creada!", description: "¡Bienvenido/a a YO TE LLEVO!" });
    router.push('/');
  };

  const handleGoogleProfileCancel = async () => {
    setGoogleProfileOpen(false);
    await signOut(auth);
    setPendingGoogleUser(null);
  };
  
  if (registrationSuccess) {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-muted/40 p-4">
             <div className="w-full max-w-sm">
                <div className="flex justify-start items-center mb-4">
                    <Button variant="ghost" onClick={() => router.push('/')}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Volver al Inicio
                    </Button>
                </div>
                <Card className="w-full text-center shadow-2xl">
                    <CardHeader>
                        <div className="flex justify-center mb-4"><MailCheck className="w-16 h-16 text-primary"/></div>
                        <CardTitle className="text-2xl">¡Último Paso!</CardTitle>
                        <CardDescription>Te enviamos un correo electrónico. Por favor, haz clic en el enlace para verificar tu cuenta y poder iniciar sesión.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground">Si no lo encuentras, revisa tu carpeta de spam.</p>
                    </CardContent>
                    <CardFooter>
                        <Button className="w-full" onClick={() => { setActiveTab('login'); setRegistrationSuccess(false); }}>
                            Volver a Iniciar Sesión
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        </div>
    )
  }

  return (
    <>
    <GoogleProfileDialog
        open={googleProfileOpen}
        firebaseUser={pendingGoogleUser}
        onComplete={handleGoogleProfileComplete}
        onCancel={handleGoogleProfileCancel}
    />
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
                    <Button
                        type="button"
                        variant="outline"
                        className="w-full h-11 gap-2 font-medium"
                        onClick={handleGoogleSignIn}
                        disabled={googleLoading}
                    >
                        {googleLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : GOOGLE_ICON}
                        Continuar con Google
                    </Button>
                    <div className="relative flex items-center gap-2">
                        <div className="flex-1 border-t border-muted-foreground/20"/>
                        <span className="text-xs text-muted-foreground uppercase px-1">O</span>
                        <div className="flex-1 border-t border-muted-foreground/20"/>
                    </div>
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
                           <PassengerRegisterForm onExistingUser={handleExistingUser} setActiveTab={setActiveTab} setRegistrationSuccess={setRegistrationSuccess} />
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
    </>
  );
}


export default function AuthPage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="w-12 h-12 animate-spin text-primary"/></div>}>
            <AuthPageContent />
        </Suspense>
    )
}

