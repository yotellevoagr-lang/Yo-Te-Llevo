

"use client"
import { useMemo, useState, useEffect } from 'react';
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { TourCard } from "@/components/tour-card"
import type { Tour } from '@/lib/types';
import { useGeoAccess } from '@/hooks/use-geo-access';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, MapPin, MessageSquare, ThumbsUp } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getAllFromCollection_client } from '@/lib/firestore-services';

function OutsideZoneNotification({ whatsappNumber }: { whatsappNumber?: string }) {
    const { toast } = useToast();

    const handleVote = () => {
        toast({
            title: "¡Voto registrado!",
            description: "Gracias por tu interés. Lo tendremos en cuenta para futuras expansiones.",
        });
    }
    
    const whatsappLink = whatsappNumber 
        ? `https://wa.me/${whatsappNumber.replace(/\D/g, '')}?text=${encodeURIComponent("Hola! Estoy fuera de la zona de servicio pero me gustaría viajar con ustedes.")}`
        : "";

    return (
        <Card className="col-span-full bg-secondary/50 my-8">
            <CardHeader className="text-center items-center">
                <MapPin className="w-10 h-10 text-primary mb-2"/>
                <CardTitle>Estás fuera de nuestra zona de servicio</CardTitle>
                <CardDescription>
                    Actualmente, solo ofrecemos ventas directas dentro de un área específica. <br/>
                    ¡Pero queremos saber de ti!
                </CardDescription>
            </CardHeader>
            <CardContent className="text-center space-y-4">
                <p className="text-muted-foreground">
                    Puedes contactarnos directamente para consultar por tu caso o votar para que lleguemos a tu ciudad.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    {whatsappLink && (
                        <Button asChild>
                            <a href={whatsappLink} target="_blank" rel="noopener noreferrer">
                                <MessageSquare className="mr-2"/> Contactar por WhatsApp
                            </a>
                        </Button>
                    )}
                    <Button variant="outline" onClick={handleVote}>
                        <ThumbsUp className="mr-2"/> ¡Quiero que vengan a mi zona!
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

export default function ToursPage() {
  const [tours, setTours] = useState<Tour[]>([]);
  const { status, mainWhatsappNumber } = useGeoAccess();

  useEffect(() => {
    const fetchTours = async () => {
        const toursData = await getAllFromCollection_client<Tour>('tours');
        const processedTours = toursData.map(t => {
          const date = (t.date as any)?.toDate ? (t.date as any).toDate() : new Date(t.date);
          return { ...t, date };
        });
        setTours(processedTours);
    };
    fetchTours();
  }, []);

  const activeTours = useMemo(() => tours.filter(tour => tour.isPublic && new Date(tour.date) >= new Date()), [tours]);
  
  const canPurchase = status === 'allowed';

  const renderContent = () => {
    if (status === 'loading') {
      return (
        <div className="col-span-full flex flex-col items-center justify-center h-64">
          <Loader2 className="w-12 h-12 animate-spin text-primary"/>
          <p className="mt-4 text-muted-foreground">Verificando tu ubicación...</p>
        </div>
      );
    }

    return (
      <>
        {activeTours.map((tour) => (
          <TourCard key={tour.id} tour={tour} canPurchase={canPurchase} />
        ))}
        {!canPurchase && <OutsideZoneNotification whatsappNumber={mainWhatsappNumber}/>}
      </>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <SiteHeader />
      <main className="flex-1">
        <div className="container py-12 md:py-24">
          <div className="flex flex-col items-center justify-center space-y-4 text-center mb-12">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl font-headline text-primary">
                Todos Nuestros Viajes
              </h1>
              <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                Explorá el catálogo completo y encontrá tu próximo destino. La aventura te espera.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {renderContent()}
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}
