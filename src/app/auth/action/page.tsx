
"use client";

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { applyActionCode, checkActionCode } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

function ActionHandler() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [message, setMessage] = useState('Procesando tu solicitud...');
    const [email, setEmail] = useState<string | null>(null);

    useEffect(() => {
        const mode = searchParams.get('mode');
        const actionCode = searchParams.get('oobCode');

        if (!mode || !actionCode) {
            setStatus('error');
            setMessage('Enlace inválido o expirado. Por favor, intenta de nuevo.');
            return;
        }

        const handleAction = async () => {
            try {
                const info = await checkActionCode(auth, actionCode);
                await applyActionCode(auth, actionCode);
                
                // On success, redirect to login page with pre-filled email
                router.replace(`/login?email=${encodeURIComponent(info.data.email || '')}&verified=true`);

            } catch (error: any) {
                if (error.code === 'auth/invalid-action-code') {
                    // This error can mean the code is invalid OR it has already been used.
                    // If it was already used, it's a "success" for the user. We check this.
                    try {
                        // Check the code again. If it throws but doesn't find a user, it's truly invalid.
                        // If it finds a user, the code was likely just used.
                        const info = await checkActionCode(auth, actionCode);
                        setEmail(info.data.email);
                        setStatus('success');
                        setMessage('¡Tu dirección de correo electrónico ya ha sido verificada!');
                    } catch (finalError) {
                        setStatus('error');
                        setMessage('El enlace de verificación es inválido o ha expirado. Por favor, solicita uno nuevo o intenta iniciar sesión.');
                    }
                } else {
                    setStatus('error');
                    setMessage('Ocurrió un error inesperado. Por favor, intenta de nuevo.');
                    console.error("Error handling action code:", error);
                }
            }
        };

        handleAction();
    }, [searchParams, router]);

    const renderContent = () => {
        switch (status) {
            case 'loading':
                return (
                    <div className="flex flex-col items-center gap-4">
                        <Loader2 className="w-12 h-12 animate-spin text-primary" />
                        <p>{message}</p>
                    </div>
                );
            case 'success': // This state is now a fallback for already-verified links
                return (
                    <div className="flex flex-col items-center gap-4 text-center">
                        <CheckCircle className="w-16 h-16 text-green-500" />
                        <CardTitle className="text-2xl">¡Email Verificado!</CardTitle>
                        <CardDescription>{message}</CardDescription>
                        <Button asChild className="mt-4">
                            <Link href={`/login?email=${encodeURIComponent(email || '')}`}>
                                Ir a Iniciar Sesión
                            </Link>
                        </Button>
                    </div>
                );
            case 'error':
                return (
                     <div className="flex flex-col items-center gap-4 text-center">
                        <AlertTriangle className="w-16 h-16 text-destructive" />
                        <CardTitle className="text-2xl">Error</CardTitle>
                        <CardDescription>{message}</CardDescription>
                         <Button asChild className="mt-4" variant="outline">
                            <Link href="/login">Volver a Intentar</Link>
                        </Button>
                    </div>
                );
        }
    };

    return (
        <div className="flex flex-col min-h-screen">
            <SiteHeader />
            <main className="flex-1 flex items-center justify-center">
                <Card className="w-full max-w-md p-4 sm:p-8">
                    <CardContent className="flex justify-center">
                        {renderContent()}
                    </CardContent>
                </Card>
            </main>
            <SiteFooter />
        </div>
    );
}


export default function AuthActionPage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="w-12 h-12 animate-spin text-primary"/></div>}>
            <ActionHandler />
        </Suspense>
    )
}
