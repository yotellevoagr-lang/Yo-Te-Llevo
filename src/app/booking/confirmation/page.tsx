"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { CheckCircle, MessageSquare, Download, ArrowLeft } from "lucide-react"
import type { Tour, Reservation, Seller, GeneralSettings, Passenger } from "@/lib/types"
import { generateDisplayID } from "@/lib/utils"

type ConfirmationData = {
    reservation: Reservation;
    tour: Tour;
    seller?: Seller;
    mainPassenger: Passenger;
}

export default function BookingConfirmationPage() {
    const router = useRouter()
    const [data, setData] = useState<ConfirmationData | null>(null)
    const [mainWhatsapp, setMainWhatsapp] = useState<string>("");

    useEffect(() => {
        const storedData = sessionStorage.getItem('ytl_last_reservation');
        if (storedData) {
            setData(JSON.parse(storedData));
        } else {
            // If there's no data, maybe redirect to home
            router.replace('/');
        }
        const storedSettings = localStorage.getItem("ytl_general_settings");
        if (storedSettings) {
             setMainWhatsapp(JSON.parse(storedSettings).mainWhatsappNumber || "");
        }
    }, [router]);

    if (!data) {
        // You can show a loading spinner here
        return <div className="flex items-center justify-center min-h-screen">Cargando confirmación...</div>
    }

    const { reservation, tour, mainPassenger } = data;

    const mainPhone = mainWhatsapp?.replace(/\D/g, '');
    const whatsappNumber = mainPhone;
    
    const displayId = generateDisplayID('R', reservation, tour, mainPassenger);
    const message = `¡Hola! Quiero coordinar el pago de mi reserva (N° ${displayId}) para el viaje a ${tour.destination}.`;
    const whatsappLink = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;

    return (
        <div className="flex flex-col min-h-screen bg-muted/20">
            <SiteHeader />
            <main className="flex-1 py-12">
                <div className="container max-w-2xl">
                    <Card className="shadow-2xl animate-fade-in-up">
                        <CardHeader className="text-center items-center">
                            <CheckCircle className="w-16 h-16 text-green-500 mb-4" />
                            <CardTitle className="text-3xl font-headline">¡Solicitud de Reserva Enviada!</CardTitle>
                            <CardDescription className="text-lg">
                                Tu lugar para <span className="font-semibold text-primary">{tour.destination}</span> ha sido pre-reservado.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="p-6 border rounded-lg bg-background space-y-4">
                                <h3 className="font-semibold text-lg">Resumen de tu reserva</h3>
                                <Separator/>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Pasajero Principal:</span>
                                    <span className="font-medium">{reservation.passenger}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Cantidad de Pasajeros:</span>
                                    <span className="font-medium">{reservation.paxCount}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">ID de Reserva:</span>
                                    <span className="font-mono bg-muted px-2 py-1 rounded-md">{displayId}</span>
                                </div>
                                <Separator />
                                 <div className="flex justify-between items-baseline text-2xl">
                                    <span className="text-muted-foreground">Precio Final:</span>
                                    <span className="font-bold text-primary">${reservation.finalPrice.toLocaleString('es-AR')}</span>
                                </div>
                            </div>
                            <div className="text-center space-y-4">
                               <p className="text-muted-foreground">
                                    El siguiente paso es coordinar el pago. Para confirmar tus lugares, por favor, contáctate con tu vendedor/a por WhatsApp.
                                </p>
                                {whatsappNumber ? (
                                    <Button asChild size="lg" className="h-14 text-lg w-full">
                                        <a href={whatsappLink} target="_blank" rel="noopener noreferrer">
                                            <MessageSquare className="mr-3"/>
                                            Pagar por WhatsApp
                                        </a>
                                    </Button>
                                ) : (
                                    <p className="font-semibold p-4 bg-yellow-100 border border-yellow-300 rounded-md">
                                        No se ha configurado un número de WhatsApp para este vendedor. Por favor, contacta a la agencia directamente.
                                    </p>
                                )}
                            </div>
                            <Separator />
                             <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                <Button asChild variant="outline">
                                    <Link href="/tours">
                                        <ArrowLeft className="mr-2 h-4 w-4"/>
                                        Ver más viajes
                                    </Link>
                                </Button>
                                {/* <Button variant="secondary">
                                    <Download className="mr-2 h-4 w-4"/>
                                    Descargar Resumen
                                </Button> */}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </main>
            <SiteFooter />
        </div>
    )
}
