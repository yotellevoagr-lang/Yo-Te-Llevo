"use client";

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { applyActionCode, checkActionCode } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Logo } from '@/components/logo';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, AlertTriangle, PartyPopper, MailCheck } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

function ActionHandler() {
    const searchParams = useSearchParams();
    const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'already_verified'>('loading');
    const [email, setEmail] = useState<string | null>(null);
    const [dots, setDots] = useState('.');

    useEffect(() => {
        if (status !== 'loading') return;
        const interval = setInterval(() => {
            setDots(d => d.length >= 3 ? '.' : d + '.');
        }, 500);
        return () => clearInterval(interval);
    }, [status]);

    useEffect(() => {
        const mode = searchParams.get('mode');
        const actionCode = searchParams.get('oobCode');

        if (!mode || !actionCode) {
            setStatus('error');
            return;
        }

        const handleAction = async () => {
            try {
                const info = await checkActionCode(auth, actionCode);
                setEmail(info.data.email || null);
                await applyActionCode(auth, actionCode);
                setStatus('success');
            } catch (error: any) {
                if (error.code === 'auth/invalid-action-code') {
                    try {
                        const info = await checkActionCode(auth, actionCode);
                        setEmail(info.data.email || null);
                        setStatus('already_verified');
                    } catch {
                        setStatus('error');
                    }
                } else {
                    setStatus('error');
                }
            }
        };

        handleAction();
    }, [searchParams]);

    const loginHref = `/login${email ? `?email=${encodeURIComponent(email)}&verified=true` : '?verified=true'}`;

    return (
        <div className="space-y-6">
            {status === 'loading' && (
                <div className="flex flex-col items-center gap-6 text-center py-6">
                    <div className="relative w-24 h-24">
                        <div className="absolute inset-0 rounded-full bg-primary/10 animate-ping" />
                        <div className="relative w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center">
                            <MailCheck className="w-12 h-12 text-primary" />
                        </div>
                    </div>
                    <div className="space-y-1">
                        <h2 className="text-xl font-bold">Verificando tu email{dots}</h2>
                        <p className="text-sm text-muted-foreground">Esto solo tarda un momento.</p>
                    </div>
                    <Loader2 className="w-6 h-6 animate-spin text-primary/50" />
                </div>
            )}

            {(status === 'success' || status === 'already_verified') && (
                <div className="flex flex-col items-center gap-6 text-center py-4">
                    <div className="w-24 h-24 rounded-full bg-green-100 flex items-center justify-center ring-8 ring-green-50">
                        {status === 'success'
                            ? <PartyPopper className="w-12 h-12 text-green-600" />
                            : <CheckCircle className="w-12 h-12 text-green-600" />
                        }
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-2xl font-bold text-green-700">
                            {status === 'success' ? '¡Email Verificado!' : '¡Ya estaba verificado!'}
                        </h2>
                        <p className="text-muted-foreground text-sm leading-relaxed">
                            {status === 'success'
                                ? 'Tu cuenta está activa. Ya podés iniciar sesión y comenzar a reservar tus viajes.'
                                : 'Tu dirección de correo electrónico ya fue verificada anteriormente.'
                            }
                        </p>
                        {email && (
                            <p className="text-xs text-muted-foreground/70 font-mono bg-muted px-3 py-1 rounded-full inline-block">
                                {email}
                            </p>
                        )}
                    </div>
                    <Button asChild size="lg" className="w-full h-12">
                        <Link href={loginHref}>
                            Iniciar Sesión →
                        </Link>
                    </Button>
                </div>
            )}

            {status === 'error' && (
                <div className="flex flex-col items-center gap-6 text-center py-4">
                    <div className="w-24 h-24 rounded-full bg-red-100 flex items-center justify-center ring-8 ring-red-50">
                        <AlertTriangle className="w-12 h-12 text-red-500" />
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-2xl font-bold text-red-600">Enlace inválido</h2>
                        <p className="text-muted-foreground text-sm leading-relaxed">
                            El enlace de verificación es inválido o ya expiró. Por favor, solicitá uno nuevo iniciando sesión.
                        </p>
                    </div>
                    <div className="flex flex-col gap-2 w-full">
                        <Button asChild size="lg" className="w-full h-12">
                            <Link href="/login">Ir al Login</Link>
                        </Button>
                        <Button asChild variant="outline" className="w-full">
                            <Link href="/verify-email">Verificar con Código</Link>
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function AuthActionPage() {
    return (
        <div className="flex flex-col min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/10">
            <div className="flex-1 flex items-center justify-center p-4">
                <div className="w-full max-w-sm space-y-6">
                    <div className="flex justify-center">
                        <Logo />
                    </div>
                    <Card className="shadow-2xl border-0 bg-card/95 backdrop-blur-sm">
                        <CardContent className="pt-6 pb-4">
                            <Suspense fallback={
                                <div className="flex justify-center py-8">
                                    <Loader2 className="animate-spin w-8 h-8 text-primary" />
                                </div>
                            }>
                                <ActionHandler />
                            </Suspense>
                        </CardContent>
                        <CardFooter className="justify-center pb-6 pt-0">
                            <p className="text-xs text-muted-foreground/60">YO TE LLEVO • Agencia de Viajes</p>
                        </CardFooter>
                    </Card>
                </div>
            </div>
        </div>
    );
}
