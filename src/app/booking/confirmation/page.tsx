
"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { CheckCircle, MessageSquare, Download, ArrowLeft, QrCode } from "lucide-react"
import type { Tour, Reservation, Seller, GeneralSettings, Passenger } from "@/lib/types"
import { generateDisplayID } from "@/lib/utils"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

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
            router.replace('/');
        }
        const storedSettings = localStorage.getItem("ytl_general_settings");
        if (storedSettings) {
             setMainWhatsapp(JSON.parse(storedSettings).mainWhatsappNumber || "");
        }
    }, [router]);

    const handleDownload = () => {
        if (!data) return;

        const doc = new jsPDF();
        const { reservation, tour, mainPassenger } = data;
        const displayId = generateDisplayID('R', reservation, tour, mainPassenger);

        doc.setFontSize(22);
        doc.text("Resumen de Reserva - YO TE LLEVO", 105, 20, { align: 'center' });

        doc.setFontSize(12);
        doc.text(`Viaje a: ${tour.destination}`, 14, 40);
        doc.text(`Fecha: ${new Date(tour.date).toLocaleDateString('es-AR')}`, 14, 47);

        autoTable(doc, {
            startY: 55,
            head: [['Detalle', 'Información']],
            body: [
                ['Pasajero Principal', reservation.passenger],
                ['Cantidad de Pasajeros', reservation.paxCount.toString()],
                ['ID de Reserva', displayId],
                ['Precio Final', `$${reservation.finalPrice.toLocaleString('es-AR')}`],
            ],
            theme: 'striped'
        });

        doc.save(`Reserva_${displayId}.pdf`);
    };

    if (!data) {
        return <div className="flex items-center justify-center min-h-screen">Cargando confirmación...</div>
    }

    const { reservation, tour, mainPassenger } = data;

    const mainPhone = mainWhatsapp?.replace(/\D/g, '');
    const whatsappNumber = mainPhone;
    
    const displayId = generateDisplayID('R', reservation, tour, mainPassenger);
    const message = `¡Hola! Quiero coordinar el pago de mi reserva (N° ${displayId}) para el viaje a ${tour.destination}.`;
    const whatsappLink = whatsappNumber ? `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}` : null;

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
                        </CardContent>
                        <CardFooter className="flex-col gap-4 p-6">
                            <p className="text-sm text-muted-foreground text-center">
                                El siguiente paso es coordinar el pago. Para confirmar tus lugares, por favor, contáctate con nosotros por WhatsApp.
                            </p>

                            {whatsappLink ? (
                                <>
                                    {/* Mobile and Main WhatsApp Button */}
                                    <Button asChild size="lg" className="h-14 text-lg w-full md:hidden">
                                        <a href={whatsappLink} target="_blank" rel="noopener noreferrer">
                                            <MessageSquare className="mr-3"/>
                                            Pagar por WhatsApp
                                        </a>
                                    </Button>

                                    {/* Desktop Buttons */}
                                    <div className="hidden md:flex flex-col items-center justify-center gap-4 w-full">
                                        <Button asChild size="lg" className="h-12 text-base w-full max-w-xs">
                                            <a href={whatsappLink} target="_blank" rel="noopener noreferrer">
                                                <MessageSquare className="mr-3"/>
                                                Pagar por WhatsApp
                                            </a>
                                        </Button>
                                        <Button variant="outline" size="lg" className="h-12 text-base w-full max-w-xs" onClick={handleDownload}>
                                            <Download className="mr-2"/>
                                            Descargar Resumen
                                        </Button>
                                        <p className="text-xs text-muted-foreground text-center max-w-xs">
                                          En caso de no poseer la versión de WhatsApp en PC, puede escanear el QR con su celular que lo redirigirá a la aplicación para coordinar el pago.
                                        </p>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button variant="outline" size="lg" className="h-12 text-base w-full max-w-xs">
                                                    <QrCode className="mr-2"/>
                                                    Escanear QR
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-2">
                                                <Image
                                                    src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(whatsappLink)}`}
                                                    alt={`QR para contactar por WhatsApp`}
                                                    width={180}
                                                    height={180}
                                                />
                                            </PopoverContent>
                                        </Popover>
                                    </div>
                                </>
                            ) : (
                                <p className="font-semibold p-4 bg-yellow-100 border border-yellow-300 rounded-md">
                                    No se ha configurado un número de WhatsApp. Por favor, contacta a la agencia directamente.
                                </p>
                            )}
                            <Separator className="mt-6" />
                            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                               <Button asChild variant="ghost">
                                   <Link href="/tours">
                                       <ArrowLeft className="mr-2 h-4 w-4"/>
                                       Ver más viajes
                                   </Link>
                               </Button>
                           </div>
                        </CardFooter>
                    </Card>
                </div>
            </main>
            <SiteFooter />
        </div>
    )
}
