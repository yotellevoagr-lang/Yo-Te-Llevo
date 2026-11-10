
"use client"
import { useMemo, useState, useEffect } from 'react';
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { TourCard } from "@/components/tour-card"
import type { Tour } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Filter, X } from 'lucide-react';
import { getAllFromCollection_client } from '@/lib/firestore-services';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';

export default function ToursPage() {
  const [tours, setTours] = useState<Tour[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [sortOrder, setSortOrder] = useState<"default" | "price-asc" | "price-desc">("default");
  const [exchangeRate, setExchangeRate] = useState<number | null>(null);
  
  useEffect(() => {
    const fetchData = async () => {
        setIsLoading(true);
        const toursData = await getAllFromCollection_client<Tour>('tours');
        
        const processedTours = toursData.map(t => ({
          ...t,
          date: t.date ? new Date((t.date as any).seconds ? (t.date as any).toDate() : t.date) : new Date()
        }));

        setTours(processedTours);
        setIsLoading(false);
    };

    const fetchExchangeRate = async () => {
        try {
            const response = await fetch('https://dolarapi.com/v1/dolares/blue');
            const data = await response.json();
            if (data && data.venta) {
                setExchangeRate(data.venta);
            }
        } catch (error) {
            console.error("Failed to fetch exchange rate:", error);
            setExchangeRate(1000); 
        }
    };
    
    fetchData();
    fetchExchangeRate();
  }, []);
  
  const activeTours = useMemo(() => tours.filter(tour => tour.isPublic && new Date(tour.date) >= new Date()), [tours]);

  useEffect(() => {
    const usedTags = new Set(activeTours.flatMap(tour => tour.tags || []));
    setAvailableTags(Array.from(usedTags));
  }, [activeTours]);

  const filteredAndSortedTours = useMemo(() => {
    let filtered = activeTours;

    if (selectedTags.length > 0) {
      filtered = filtered.filter(tour => 
        selectedTags.some(tag => tour.tags?.includes(tag))
      );
    }
    
    const getNormalizedPrice = (tour: Tour): number => {
        if (tour.currency === 'USD' && exchangeRate) {
            return tour.price * exchangeRate;
        }
        return tour.price;
    }

    switch (sortOrder) {
      case 'price-asc':
        return [...filtered].sort((a, b) => getNormalizedPrice(a) - getNormalizedPrice(b));
      case 'price-desc':
        return [...filtered].sort((a, b) => getNormalizedPrice(b) - getNormalizedPrice(a));
      case 'default':
      default:
        return [...filtered].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }
  }, [activeTours, selectedTags, sortOrder, exchangeRate]);

  const handleTagToggle = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="col-span-full flex flex-col items-center justify-center h-64">
          <Loader2 className="w-12 h-12 animate-spin text-primary"/>
          <p className="mt-4 text-muted-foreground">Buscando viajes...</p>
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

    return filteredAndSortedTours.map((tour) => (
      <TourCard key={tour.id} tour={tour} />
    ));
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
              <div className="sm:ml-4 flex-1 w-full">
                <ScrollArea className="max-h-24 w-full">
                  <div className="flex flex-wrap items-center gap-2 py-1">
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
                </ScrollArea>
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
