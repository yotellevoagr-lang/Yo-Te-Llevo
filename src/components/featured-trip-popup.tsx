
"use client"

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";
import type { Tour } from "@/lib/types";
import { getDisplayUrl } from "@/lib/utils";

interface FeaturedTripPopupProps {
  tours: Tour[];
}

export function FeaturedTripPopup({ tours }: FeaturedTripPopupProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTour, setSelectedTour] = useState<Tour | null>(null);

  useEffect(() => {
    const hasSeenPopup = sessionStorage.getItem("ytl_popup_seen");
    
    if (!hasSeenPopup && tours.length > 0) {
      // Select a random tour from the provided list
      const randomIndex = Math.floor(Math.random() * tours.length);
      setSelectedTour(tours[randomIndex]);
      
      // Delay opening the popup slightly for a better user experience
      const timer = setTimeout(() => {
        setIsOpen(true);
        sessionStorage.setItem("ytl_popup_seen", "true");
      }, 2000); // 2-second delay

      return () => clearTimeout(timer);
    }
  }, [tours]);

  if (!selectedTour) {
    return null;
  }
  
  const currencySymbol = selectedTour.currency === 'USD' ? 'U$S' : '$';

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden rounded-lg" hideCloseButton={false}>
        <DialogHeader className="sr-only">
          <DialogTitle>Viaje Destacado: {selectedTour.destination}</DialogTitle>
          <DialogDescription>
            Una oferta especial para nuestro viaje a {selectedTour.destination}.
          </DialogDescription>
        </DialogHeader>
        <div className="relative aspect-video">
          <Image
            src={getDisplayUrl(selectedTour.backgroundImage || "https://placehold.co/600x400.png")}
            alt={selectedTour.destination}
            fill
            className="object-cover"
            data-ai-hint="travel landscape"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
        </div>
        <div className="p-6 pt-2 space-y-4 text-center">
            <div className="inline-block -mt-8 relative px-4 py-1 text-sm font-semibold tracking-wider rounded-full bg-primary text-primary-foreground shadow-lg">
                <Sparkles className="w-4 h-4 absolute -left-1 -top-1 text-yellow-300 animate-pulse"/>
                VIAJE DESTACADO
            </div>
            <h2 className="text-3xl font-headline text-foreground">{selectedTour.destination}</h2>
            <p className="text-muted-foreground">¡No te pierdas esta oportunidad única! Reserva tu lugar ahora.</p>
            <div className="text-left">
                <p className="text-sm text-muted-foreground">Desde</p>
                <p className="text-5xl font-bold text-primary">{currencySymbol}{selectedTour.price.toLocaleString('es-AR')}</p>
            </div>
            <Button asChild size="lg" className="w-full text-lg h-12 group">
                <Link href={`/booking/${selectedTour.id}`}>
                    Reservar Ahora
                    <ArrowRight className="w-5 h-5 ml-2 transition-transform duration-300 group-hover:translate-x-1" />
                </Link>
            </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

