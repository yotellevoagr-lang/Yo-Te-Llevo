
"use client"

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { useAuth } from "@/components/auth/auth-provider";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, Plane, History, Package } from "lucide-react";
import { getAllFromCollection_client } from "@/lib/firestore-services";
import type { Tour, Reservation } from "@/lib/types";
import Image from "next/image";
import { getDisplayUrl } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

const TripHistoryCard = ({ reservation, tour }: { reservation: Reservation, tour: Tour }) => {
    const imageUrl = tour.backgroundImage || "https://placehold.co/400x300.png?text=Viaje";
    return (
        <Card className="overflow-hidden">
            <CardContent className="p-0">
                <div className="relative w-full h-40">
                    <Image src={getDisplayUrl(imageUrl)} alt={tour.destination} layout="fill" objectFit="cover" data-ai-hint="travel landscape" />
                </div>
                <div className="p-4">
                    <h3 className="font-semibold text-lg">{tour.destination}</h3>
                    <p className="text-sm text-muted-foreground">{new Date(tour.date).toLocaleDateString('es-AR', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                    <div className="flex justify-between items-center mt-2 text-xs">
                        <Badge variant={reservation.status === 'Confirmado' ? 'default' : 'secondary'}>{reservation.status}</Badge>
                        <span className="font-semibold">{reservation.paxCount} pasajero(s)</span>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
};

export default function MyTripsPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const [reservations, setReservations] = useState<Reservation[]>([]);
    const [tours, setTours] = useState<Tour[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!authLoading) {
            if (!user) {
                router.replace('/login');
                return;
            }
            
            const fetchData = async () => {
                setIsLoading(true);
                const [allReservations, allTours] = await Promise.all([
                    getAllFromCollection_client<Reservation>('reservations'),
                    getAllFromCollection_client<Tour>('tours')
                ]);

                const userReservations = allReservations.filter(r => r.passengerIds.includes(user.id));
                const processedTours = allTours.map(t => ({
                    ...t,
                    date: t.date ? new Date((t.date as any).seconds ? (t.date as any).toDate() : t.date) : new Date()
                }));
                
                setReservations(userReservations);
                setTours(processedTours);
                setIsLoading(false);
            };

            fetchData();
        }
    }, [user, authLoading, router]);

    const { upcomingTrips, completedTrips, totalTripsCount } = useMemo(() => {
        const now = new Date();
        const userTours = reservations.map(res => {
            const tour = tours.find(t => t.id === res.tripId);
            return tour ? { reservation: res, tour } : null;
        }).filter(Boolean);

        const upcoming = userTours
            .filter(item => item!.tour.date >= now && item!.reservation.status === 'Confirmado')
            .sort((a, b) => a!.tour.date.getTime() - b!.tour.date.getTime());

        const completed = userTours
            .filter(item => item!.tour.date < now)
            .sort((a, b) => b!.tour.date.getTime() - a!.tour.date.getTime());
            
        return {
            upcomingTrips: upcoming,
            completedTrips: completed.slice(0, 5),
            totalTripsCount: completed.length
        };
    }, [reservations, tours]);

    if (authLoading || isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="w-12 h-12 animate-spin text-primary"/>
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-screen bg-muted/20">
            <SiteHeader />
            <main className="flex-1 py-12 md:py-16">
                <div className="container max-w-4xl">
                     <Button asChild variant="ghost" className="mb-8">
                        <Link href="/profile">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Volver a Mi Perfil
                        </Link>
                    </Button>

                    <Card className="mb-8">
                        <CardHeader className="text-center">
                            <CardTitle className="text-3xl font-headline">Mi Historial de Viajes</CardTitle>
                            <CardDescription>¡Aquí están todas las aventuras que hemos compartido!</CardDescription>
                        </CardHeader>
                        <CardContent className="flex justify-center">
                             <div className="flex items-center gap-3 p-4 rounded-lg bg-primary text-primary-foreground">
                                <Package className="w-8 h-8"/>
                                <div>
                                    <p className="text-sm">Viajes Realizados</p>
                                    <p className="text-3xl font-bold">{totalTripsCount}</p>
                                </div>
                             </div>
                        </CardContent>
                    </Card>

                    <section className="space-y-6">
                        <div>
                            <h2 className="text-2xl font-semibold flex items-center gap-2 mb-4"><Plane className="w-6 h-6 text-primary"/> Próximos Viajes</h2>
                            {upcomingTrips.length > 0 ? (
                                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {upcomingTrips.map(item => item && <TripHistoryCard key={item.reservation.id} reservation={item.reservation} tour={item.tour} />)}
                                </div>
                            ) : (
                                <p className="text-muted-foreground p-4 border-dashed border-2 rounded-lg text-center">No tienes viajes programados. ¿Qué esperas para la próxima aventura?</p>
                            )}
                        </div>

                         <div>
                            <h2 className="text-2xl font-semibold flex items-center gap-2 mb-4"><History className="w-6 h-6 text-primary"/> Últimos 5 Viajes Realizados</h2>
                            {completedTrips.length > 0 ? (
                                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {completedTrips.map(item => item && <TripHistoryCard key={item.reservation.id} reservation={item.reservation} tour={item.tour} />)}
                                </div>
                            ) : (
                                <p className="text-muted-foreground p-4 border-dashed border-2 rounded-lg text-center">Aún no has completado viajes con nosotros.</p>
                            )}
                        </div>
                    </section>
                </div>
            </main>
            <SiteFooter />
        </div>
    );
}
