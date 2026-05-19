"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Loader2, CheckCircle, AlertTriangle, Mail, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";

function VerifyEmailContent() {
    const searchParams = useSearchParams();
    const { toast } = useToast();
    const [code, setCode] = useState(searchParams.get('code') || '');
    const uid = searchParams.get('uid') || '';
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [errorMsg, setErrorMsg] = useState('');

    const handleVerify = async () => {
        if (code.length < 6) {
            toast({ title: "Código incompleto", description: "Ingresá los 6 dígitos del código.", variant: "destructive" });
            return;
        }
        setStatus('loading');
        try {
            const res = await fetch('/api/verify-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code: code.trim(), uid }),
            });
            const data = await res.json();
            if (res.ok) {
                setStatus('success');
            } else {
                setStatus('error');
                setErrorMsg(data.error || 'Código inválido o expirado.');
            }
        } catch {
            setStatus('error');
            setErrorMsg('Error de conexión. Intenta de nuevo.');
        }
    };

    if (status === 'success') {
        return (
            <div className="flex flex-col items-center gap-6 text-center py-4">
                <div className="w-24 h-24 rounded-full bg-green-100 flex items-center justify-center ring-8 ring-green-50">
                    <CheckCircle className="w-14 h-14 text-green-600" />
                </div>
                <div className="space-y-1">
                    <h2 className="text-2xl font-bold">¡Email Verificado!</h2>
                    <p className="text-muted-foreground text-sm">Tu cuenta está lista. Ya podés iniciar sesión.</p>
                </div>
                <Button asChild className="w-full h-11">
                    <Link href="/login">Ir a Iniciar Sesión</Link>
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="text-center space-y-3">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto ring-8 ring-primary/5">
                    <Mail className="w-8 h-8 text-primary" />
                </div>
                <div className="space-y-1">
                    <h2 className="text-xl font-bold">Verificar tu Email</h2>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                        Ingresá el código de 6 dígitos que enviamos a tu correo electrónico.
                    </p>
                </div>
            </div>

            <div className="space-y-2">
                <Label className="text-sm font-medium">Código de verificación</Label>
                <Input
                    value={code}
                    onChange={(e) => {
                        setStatus('idle');
                        setCode(e.target.value.replace(/\D/g, '').slice(0, 6));
                    }}
                    placeholder="123456"
                    maxLength={6}
                    className="text-center text-3xl tracking-[0.6em] h-16 font-mono border-2 focus-visible:ring-2"
                    onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
                    disabled={status === 'loading'}
                />
                {status === 'error' && (
                    <p className="text-sm text-destructive flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        {errorMsg}
                    </p>
                )}
            </div>

            <Button
                onClick={handleVerify}
                disabled={status === 'loading' || code.length < 6}
                className="w-full h-11"
            >
                {status === 'loading'
                    ? <Loader2 className="animate-spin mr-2 h-4 w-4" />
                    : <ShieldCheck className="mr-2 h-4 w-4" />}
                {status === 'loading' ? 'Verificando...' : 'Verificar Código'}
            </Button>

            <div className="text-center space-y-1">
                <p className="text-xs text-muted-foreground">
                    ¿No recibiste el código? Revisá tu carpeta de spam o verificá por el link del correo.
                </p>
                <Button variant="link" size="sm" asChild className="text-xs h-auto">
                    <Link href="/login">Volver al inicio de sesión</Link>
                </Button>
            </div>
        </div>
    );
}

export default function VerifyEmailPage() {
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
                                <VerifyEmailContent />
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
