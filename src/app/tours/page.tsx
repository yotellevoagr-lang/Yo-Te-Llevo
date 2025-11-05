

"use client"
import { useMemo, useState, useEffect } from 'react';
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { TourCard } from "@/components/tour-card"
import type { Tour } from '@/lib/types';
import { useGeoAccess } from '@/hooks/use-geo-access';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, MapPin, MessageSquare, ThumbsUp, Filter, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getAllFromCollection_client, getDocumentById } from '@/lib/firestore-services';
import type { GeneralSettings } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

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
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [sortOrder, setSortOrder] = useState<"default" | "price-asc" | "price-desc">("default");
  
  useEffect(() => {
    const fetchData = async () => {
        const [toursData, settingsData] = await Promise.all([
            getAllFromCollection_client<Tour>('tours'),
            getDocumentById<GeneralSettings>('settings', 'general')
        ]);
        
        const processedTours = toursData.map(t => ({
          ...t,
          date: t.date ? new Date((t.date as any).seconds ? (t.date as any).toDate() : t.date) : new Date()
        }));

        setTours(processedTours);
        
        // Determine which tags are actually in use by active tours
        const activePublicTours = processedTours.filter(tour => tour.isPublic && new Date(tour.date) >= new Date());
        const usedTags = new Set(activePublicTours.flatMap(tour => tour.tags || []));
        setAvailableTags(Array.from(usedTags));
    };
    fetchData();
  }, []);

  const activeTours = useMemo(() => tours.filter(tour => tour.isPublic && new Date(tour.date) >= new Date()), [tours]);
  
  const filteredAndSortedTours = useMemo(() => {
    let filtered = activeTours;

    // Filter by tags
    if (selectedTags.length > 0) {
      filtered = filtered.filter(tour => 
        selectedTags.every(tag => tour.tags?.includes(tag))
      );
    }

    // Sort
    switch (sortOrder) {
      case 'price-asc':
        return [...filtered].sort((a, b) => a.price - b.price);
      case 'price-desc':
        return [...filtered].sort((a, b) => b.price - a.price);
      case 'default':
      default:
        return [...filtered].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }
  }, [activeTours, selectedTags, sortOrder]);


  const handleTagToggle = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

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
    
    if (filteredAndSortedTours.length === 0) {
      return (
         <div className="col-span-full flex flex-col items-center justify-center h-64 text-center">
          <Filter className="w-12 h-12 text-muted-foreground mb-4"/>
          <p className="text-lg font-semibold">No se encontraron viajes</p>
          <p className="text-muted-foreground">Prueba ajustar los filtros o vuelve más tarde.</p>
        </div>
      );
    }

    return (
      <>
        {filteredAndSortedTours.map((tour) => (
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
          
           <Card className="mb-8 p-4">
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="flex items-center gap-2">
                  <Filter className="w-5 h-5 text-muted-foreground" />
                  <span className="font-semibold">Ordenar por:</span>
              </div>
              <Select value={sortOrder} onValueChange={(val) => setSortOrder(val as any)}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                      <SelectValue placeholder="Ordenar" />
                  </SelectTrigger>
                  <SelectContent>
                      <SelectItem value="default">Fecha de salida</SelectItem>
                      <SelectItem value="price-asc">Menor precio</SelectItem>
                      <SelectItem value="price-desc">Mayor precio</SelectItem>
                  </SelectContent>
              </Select>
              <div className="flex flex-wrap items-center gap-2 pt-4 sm:pt-0 sm:ml-4">
                  {availableTags.map(tag => (
                      <Button 
                        key={tag}
                        variant={selectedTags.includes(tag) ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handleTagToggle(tag)}
                        className="rounded-full"
                      >
                        {tag}
                        {selectedTags.includes(tag) && <X className="ml-2 w-3 h-3"/>}
                      </Button>
                  ))}
              </div>
            </div>
          </Card>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {renderContent()}
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}

    