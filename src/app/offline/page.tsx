"use client"

import { Logo } from "@/components/logo";
import { Montserrat } from "next/font/google";

const montserrat = Montserrat({
  subsets: ['latin'],
  weight: ['700'],
});

export default function OfflinePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground">
      <div className="flex flex-col items-center justify-center animate-pulse">
        <Logo />
        <h1 className={`mt-4 text-4xl font-bold tracking-tight ${montserrat.className}`}>
            YO TE LLEVO
        </h1>
      </div>
      <p className="mt-4 text-muted-foreground">
        Cargando aplicación...
      </p>
    </div>
  );
}
