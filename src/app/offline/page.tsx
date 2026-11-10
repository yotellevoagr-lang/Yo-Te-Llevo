"use client";

import Link from "next/link";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { WifiOff, Home, Compass, RefreshCw } from "lucide-react";

export default function OfflinePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground p-6">
      <Card className="max-w-md w-full border-border/80 shadow-xl">
        <CardContent className="pt-8 pb-8 px-6 flex flex-col items-center text-center space-y-5">
          <Logo />

          <div className="w-16 h-16 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <WifiOff className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight">
              Estás sin conexión a internet
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Esta ruta no fue visitada previamente mientras tenías conexión. Podés volver a las páginas ya cargadas para ver los viajes disponibles o realizar reservas sin conexión.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full pt-2">
            <Button asChild className="flex-1 gap-2">
              <Link href="/">
                <Home className="w-4 h-4" />
                Ir al Inicio
              </Link>
            </Button>
            <Button asChild variant="outline" className="flex-1 gap-2">
              <Link href="/tours">
                <Compass className="w-4 h-4" />
                Ver Viajes Cargados
              </Link>
            </Button>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.location.reload()}
            className="text-xs text-muted-foreground gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Reintentar conexión
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
