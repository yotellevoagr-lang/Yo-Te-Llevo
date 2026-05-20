

"use client"

import { useMemo, useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { ArrowRight, Maximize, Loader2, Image as ImageIcon, CalendarDays, DollarSign, MapPin, Clock, Moon } from "lucide-react"
import { getAllFromCollection_client } from "@/lib/firestore-services";
import { getDisplayUrl } from "@/lib/utils";
import type { Flyer, Tour } from "@/lib/types";
import { Badge } from "@/components/ui/badge";

const FlyerCard = ({ flyer, tour, onImageClick, showPromo = false }: { flyer: Flyer, tour?: Tour, onImageClick: (flyer: Flyer) => void, showPromo?: boolean }) => {
    return (
        <Card className="w-full overflow-hidden transition-all duration-300 ease-in-out border-2 border-transparent rounded-2xl group hover:shadow-2xl hover:border-primary hover:-translate-y-2">
            <CardContent className="p-0">
                {flyer.name && (
                    <div className="px-4 py-2 bg-primary/10 text-center">
                        <span className="text-sm font-medium text-primary">{flyer.name}</span>
                    </div>
                )}
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
                            alt={flyer.name || 'Flyer'}
                            fill
                            sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                            className="object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent flex flex-col justify-end p-6">
                        {tour && <p className="text-white/90 drop-shadow-md text-lg">{tour.destination}</p>}
                    </div>
                     <div className="absolute top-4 right-4 bg-black/30 backdrop-blur-sm p-2 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity">
                        <Maximize className="w-5 h-5"/>
                    </div>
                </div>
                {showPromo && (
                    <div className="px-4 py-2 bg-primary text-center">
                        <span className="text-sm font-bold text-white">PROMO</span>
                    </div>
                )}
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
    const [viewingFlyer, setViewingFlyer] = useState<{ flyer: Flyer; tour?: Tour } | null>(null);

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
    }, []);

    const handleImageClick = (flyer: Flyer) => {
        const tour = flyer.tourId ? tours.find(t => t.id === flyer.tourId) : undefined;
        setViewingFlyer({ flyer, tour });
        setIsViewerOpen(true);
    };

    const promotionalFlyers = useMemo(() => flyers.filter(f => f.isGeneralPromotion && !f.tourId), [flyers]);
    
    const flyersByTrip = useMemo(() => {
        const tripFlyers = flyers.filter(f => f.tourId);
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
    
    const sortFlyersByPromo = (flyersList: Flyer[]) => {
        return [...flyersList].sort((a, b) => {
            if (a.isGeneralPromotion && !b.isGeneralPromotion) return -1;
            if (!a.isGeneralPromotion && b.isGeneralPromotion) return 1;
            return 0;
        });
    };

    return (
        <div className="flex flex-col min-h-screen">
        <SiteHeader />
        <main className="flex-1">
            <Dialog open={isViewerOpen} onOpenChange={setIsViewerOpen}>
                <DialogContent className="max-w-3xl p-0 overflow-hidden rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="sr-only">Vista del Flyer</DialogTitle>
                        <DialogDescription className="sr-only">Detalle del flyer e información del viaje</DialogDescription>
                    </DialogHeader>
                    {viewingFlyer && (
                        <div className="flex flex-col md:flex-row max-h-[90vh]">
                            {/* Flyer portrait */}
                            <div className="md:w-[45%] shrink-0 relative">
                                {viewingFlyer.flyer.type === 'video' ? (
                                    <video
                                        src={getDisplayUrl(viewingFlyer.flyer.url)}
                                        autoPlay muted loop playsInline controls
                                        className="w-full h-full object-cover max-h-[50vh] md:max-h-[90vh]"
                                    />
                                ) : (
                                    <div className="relative w-full aspect-[9/16] max-h-[50vh] md:max-h-[90vh]">
                                        <Image
                                            src={getDisplayUrl(viewingFlyer.flyer.url)}
                                            alt={viewingFlyer.flyer.name || 'Flyer'}
                                            fill
                                            className="object-cover"
                                            sizes="(max-width: 768px) 100vw, 45vw"
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Info panel */}
                            <div className="flex-1 flex flex-col overflow-y-auto p-6 md:p-8 bg-card">
                                {viewingFlyer.flyer.name && (
                                    <p className="text-sm font-medium text-primary mb-1">{viewingFlyer.flyer.name}</p>
                                )}
                                {viewingFlyer.tour ? (
                                    <>
                                        <h2 className="text-2xl md:text-3xl font-bold font-headline text-foreground mb-4">
                                            {viewingFlyer.tour.destination}
                                        </h2>

                                        <div className="space-y-3 mb-6">
                                            {viewingFlyer.tour.date && (
                                                <div className="flex items-center gap-3 text-sm">
                                                    <CalendarDays className="w-4 h-4 text-primary shrink-0"/>
                                                    <span className="text-muted-foreground">Salida:</span>
                                                    <span className="font-medium">
                                                        {new Date(viewingFlyer.tour.date).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })}
                                                    </span>
                                                </div>
                                            )}
                                            {viewingFlyer.tour.price > 0 && (
                                                <div className="flex items-center gap-3 text-sm">
                                                    <DollarSign className="w-4 h-4 text-primary shrink-0"/>
                                                    <span className="text-muted-foreground">Precio:</span>
                                                    <span className="font-bold text-base text-foreground">
                                                        {viewingFlyer.tour.currency === 'USD' ? 'USD' : '$'} {viewingFlyer.tour.price.toLocaleString('es-AR')}
                                                    </span>
                                                </div>
                                            )}
                                            {(viewingFlyer.tour.days || viewingFlyer.tour.nights) && (
                                                <div className="flex items-center gap-3 text-sm">
                                                    <Moon className="w-4 h-4 text-primary shrink-0"/>
                                                    <span className="text-muted-foreground">Duración:</span>
                                                    <span className="font-medium">
                                                        {viewingFlyer.tour.nights ? `${viewingFlyer.tour.nights} noches` : ''}{viewingFlyer.tour.days ? ` / ${viewingFlyer.tour.days} días` : ''}
                                                    </span>
                                                </div>
                                            )}
                                            {viewingFlyer.tour.origin && (
                                                <div className="flex items-center gap-3 text-sm">
                                                    <MapPin className="w-4 h-4 text-primary shrink-0"/>
                                                    <span className="text-muted-foreground">Origen:</span>
                                                    <span className="font-medium">{viewingFlyer.tour.origin}</span>
                                                </div>
                                            )}
                                            {viewingFlyer.tour.departureTime && (
                                                <div className="flex items-center gap-3 text-sm">
                                                    <Clock className="w-4 h-4 text-primary shrink-0"/>
                                                    <span className="text-muted-foreground">Horario:</span>
                                                    <span className="font-medium">{viewingFlyer.tour.departureTime}</span>
                                                </div>
                                            )}
                                        </div>

                                        {viewingFlyer.tour.tags && viewingFlyer.tour.tags.length > 0 && (
                                            <div className="flex flex-wrap gap-2 mb-6">
                                                {viewingFlyer.tour.tags.map(tag => (
                                                    <Badge key={tag} variant="secondary">{tag}</Badge>
                                                ))}
                                            </div>
                                        )}

                                        {viewingFlyer.tour.description && (
                                            <p className="text-sm text-muted-foreground mb-6 leading-relaxed line-clamp-4">
                                                {viewingFlyer.tour.description}
                                            </p>
                                        )}

                                        <div className="mt-auto pt-4 border-t">
                                            <Button asChild size="lg" className="w-full text-base rounded-xl">
                                                <Link href={`/booking/${viewingFlyer.tour.id}`} prefetch={false} onClick={() => setIsViewerOpen(false)}>
                                                    Reservar ahora
                                                    <ArrowRight className="w-4 h-4 ml-2"/>
                                                </Link>
                                            </Button>
                                        </div>
                                    </>
                                ) : (
                                    <div className="flex flex-col items-center justify-center flex-1 gap-3 text-center py-8">
                                        <ImageIcon className="w-12 h-12 text-muted-foreground/40"/>
                                        <p className="text-muted-foreground">Este flyer es una promoción general.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
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
                             <h2 className="text-2xl font-bold tracking-tighter sm:text-4xl font-headline mb-8">PROMO</h2>
                             <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                                {promotionalFlyers.map(flyer => (
                                    <FlyerCard key={flyer.id} flyer={flyer} onImageClick={handleImageClick}/>
                                ))}
                            </div>
                        </div>
                    )}
                    
                    {Object.values(flyersByTrip).map(({ tour, flyers: tripFlyers }) => (
                         <div key={tour.id}>
                             <h2 className="text-2xl font-bold tracking-tighter sm:text-4xl font-headline mb-8">{tour.destination}</h2>
                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                                {sortFlyersByPromo(tripFlyers).map(flyer => (
                                    <FlyerCard key={flyer.id} flyer={flyer} tour={tour} onImageClick={handleImageClick} showPromo={flyer.isGeneralPromotion}/>
                                ))}
                            </div>
                        </div>
                    ))}
                    
                    {unassignedFlyers.length > 0 && (
                        <div>
                             <h2 className="text-2xl font-bold tracking-tighter sm:text-4xl font-headline mb-8">Viajes</h2>
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
