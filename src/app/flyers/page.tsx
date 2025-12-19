

"use client"

import { useMemo, useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ArrowRight, Maximize, Loader2, Image as ImageIcon } from "lucide-react"
import { getAllFromCollection_client } from "@/lib/firestore-services";
import { getDisplayUrl } from "@/lib/utils";
import type { Flyer, Tour } from "@/lib/types";

const FlyerCard = ({ flyer, tour, onImageClick }: { flyer: Flyer, tour?: Tour, onImageClick: (flyer: Flyer) => void }) => {
    return (
        <Card className="w-full overflow-hidden transition-all duration-300 ease-in-out border-2 border-transparent rounded-2xl group hover:shadow-2xl hover:border-primary hover:-translate-y-2">
            <CardContent className="p-0">
                <div className="relative overflow-hidden aspect-[9/16] cursor-pointer" onClick={() => onImageClick(flyer)}>
                     {flyer.type === 'video' ? (
                        <video 
                            src={getDisplayUrl(flyer.url)} 
                            autoPlay 
                            muted 
                            loop 
                            playsInline
                            className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
                        />
                    ) : (
                        <Image
                            src={getDisplayUrl(flyer.url)}
                            alt={flyer.name}
                            fill
                            sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                            className="object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent flex flex-col justify-end p-6">
                        <h3 className="text-3xl font-headline text-white drop-shadow-lg">{flyer.name}</h3>
                        {tour && <p className="text-white/90 drop-shadow-md">{tour.destination}</p>}
                    </div>
                     <div className="absolute top-4 right-4 bg-black/30 backdrop-blur-sm p-2 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity">
                        <Maximize className="w-5 h-5"/>
                    </div>
                </div>
                {tour && (
                    <div className="p-6 bg-card">
                        <Button asChild size="lg" className="w-full text-base rounded-xl">
                            <Link href={`/booking/${tour.id}`} prefetch={false}>
                            Reservar
                            <ArrowRight className="w-4 h-4 ml-2" />
                            </Link>
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}

export default function FlyersPage() {
    const [flyers, setFlyers] = useState<Flyer[]>([]);
    const [tours, setTours] = useState<Tour[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isViewerOpen, setIsViewerOpen] = useState(false);
    const [viewingMedia, setViewingMedia] = useState<{ url: string; type: 'image' | 'video' } | null>(null);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [flyersData, toursData] = await Promise.all([
                getAllFromCollection_client<Flyer>('flyers'),
                getAllFromCollection_client<Tour>('tours'),
            ]);
            setFlyers(flyersData);
            setTours(toursData);
        } catch (error) {
            console.error('Error al cargar flyers:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        window.addEventListener('storage', fetchData);
        return () => {
          window.removeEventListener('storage', fetchData);
        };
    }, []);

    const handleImageClick = (flyer: Flyer) => {
        setViewingMedia({ url: flyer.url, type: flyer.type });
        setIsViewerOpen(true);
    };

    const promotionalFlyers = useMemo(() => flyers.filter(f => f.isGeneralPromotion), [flyers]);
    
    const flyersByTrip = useMemo(() => {
        const tripFlyers = flyers.filter(f => f.tourId && !f.isGeneralPromotion);
        return tripFlyers.reduce((acc, flyer) => {
            if (flyer.tourId) {
                if (!acc[flyer.tourId]) {
                    const tour = tours.find(t => t.id === flyer.tourId);
                    if (tour) {
                        acc[flyer.tourId] = { tour, flyers: [] };
                    }
                }
                 if (acc[flyer.tourId]) {
                    acc[flyer.tourId].flyers.push(flyer);
                }
            }
            return acc;
        }, {} as Record<string, { tour: Tour; flyers: Flyer[] }>);
    }, [flyers, tours]);
    
    const unassignedFlyers = useMemo(() => {
        return flyers.filter(f => !f.isGeneralPromotion && !f.tourId);
    }, [flyers]);

    return (
        <div className="flex flex-col min-h-screen">
        <SiteHeader />
        <main className="flex-1">
            <Dialog open={isViewerOpen} onOpenChange={setIsViewerOpen}>
                <DialogContent className="max-w-4xl max-h-[90vh] bg-transparent border-none shadow-none p-2">
                    <DialogHeader>
                        <DialogTitle className="sr-only">Vista Previa del Flyer</DialogTitle>
                    </DialogHeader>
                    <div className="flex justify-center items-center h-full">
                        {viewingMedia?.type === 'video' ? (
                            <video src={getDisplayUrl(viewingMedia.url)} controls autoPlay className="max-w-full max-h-[85vh] rounded-lg" />
                        ) : (
                            <Image src={getDisplayUrl(viewingMedia?.url)} alt="Vista previa del flyer" width={1000} height={1000} className="max-w-full max-h-[85vh] object-contain rounded-lg"/>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            <div className="container py-12 md:py-24">
            <div className="flex flex-col items-center justify-center space-y-4 text-center mb-12">
                <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl font-headline text-primary">
                    Novedades y Promociones
                </h1>
                <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                    Enterate de los próximos viajes, ofertas especiales y toda la información que necesitás para tu próxima aventura.
                </p>
                </div>
            </div>

            {isLoading ? (
                <div className="flex justify-center items-center h-64">
                    <Loader2 className="w-12 h-12 animate-spin text-primary" />
                </div>
            ) : (
                <div className="space-y-16">
                    {promotionalFlyers.length > 0 && (
                        <div>
                             <h2 className="text-2xl font-bold tracking-tighter sm:text-4xl font-headline mb-8">Promociones Generales</h2>
                             <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                                {promotionalFlyers.map(flyer => (
                                    <FlyerCard key={flyer.id} flyer={flyer} onImageClick={handleImageClick}/>
                                ))}
                            </div>
                        </div>
                    )}
                    
                    {Object.values(flyersByTrip).map(({ tour, flyers }) => (
                         <div key={tour.id}>
                             <h2 className="text-2xl font-bold tracking-tighter sm:text-4xl font-headline mb-8">{tour.destination}</h2>
                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                                {flyers.map(flyer => (
                                    <FlyerCard key={flyer.id} flyer={flyer} tour={tour} onImageClick={handleImageClick}/>
                                ))}
                            </div>
                        </div>
                    ))}
                    
                    {unassignedFlyers.length > 0 && (
                        <div>
                             <h2 className="text-2xl font-bold tracking-tighter sm:text-4xl font-headline mb-8">Otros Flyers</h2>
                             <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                                {unassignedFlyers.map(flyer => (
                                    <FlyerCard key={flyer.id} flyer={flyer} onImageClick={handleImageClick}/>
                                ))}
                            </div>
                        </div>
                    )}

                    {promotionalFlyers.length === 0 && Object.keys(flyersByTrip).length === 0 && unassignedFlyers.length === 0 && (
                         <Card>
                            <CardContent className="p-12 text-center flex flex-col items-center gap-4">
                                <ImageIcon className="w-16 h-16 text-muted-foreground/50"/>
                                <p className="text-muted-foreground">
                                    No hay flyers o promociones disponibles en este momento. ¡Vuelve pronto!
                                </p>
                            </CardContent>
                        </Card>
                    )}
                </div>
            )}
            </div>
        </main>
        <SiteFooter />
        </div>
    )
}
