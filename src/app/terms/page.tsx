
"use client"

import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

export default function TermsPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <SiteHeader />
      <main className="flex-1">
        <div className="container py-12 md:py-24">
            <Button asChild variant="ghost" className="mb-8">
                <Link href="/">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Volver al Inicio
                </Link>
            </Button>
          <div className="mx-auto max-w-4xl">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="text-3xl font-headline">
                  Términos y Condiciones de Servicio
                </CardTitle>
                <CardDescription>
                  Última actualización: {new Date().toLocaleDateString('es-AR')}
                </CardDescription>
              </CardHeader>
              <CardContent className="prose prose-sm max-w-none text-muted-foreground space-y-4">
                <p>
                  Bienvenido a YO TE LLEVO. Estos términos y condiciones describen las reglas y regulaciones para el uso de nuestro sitio web y la contratación de nuestros servicios.
                </p>
                
                <h3 className="font-semibold text-foreground">1. Aceptación de los Términos</h3>
                <p>
                  Al acceder a este sitio web y/o contratar nuestros servicios, asumimos que aceptas estos términos y condiciones en su totalidad. No continúes usando el sitio web de YO TE LLEVO si no aceptas todos los términos y condiciones establecidos en esta página.
                </p>

                <h3 className="font-semibold text-foreground">2. Reservas y Pagos</h3>
                <p>
                  Todas las reservas están sujetas a disponibilidad. La reserva se considera confirmada únicamente después de la coordinación y recepción del pago acordado con uno de nuestros vendedores autorizados. Los precios están sujetos a cambios sin previo aviso hasta que la reserva sea confirmada.
                </p>

                <h3 className="font-semibold text-foreground">3. Cancelaciones y Reembolsos</h3>
                <p>
                  Nuestra política de cancelación varía según el viaje y se especificará en los detalles de cada paquete turístico. Es responsabilidad del cliente revisar la política de cancelación aplicable antes de confirmar su reserva.
                </p>

                 <h3 className="font-semibold text-foreground">4. Responsabilidad del Pasajero</h3>
                <p>
                  Es responsabilidad de cada pasajero contar con la documentación necesaria para viajar (DNI, pasaporte, visas, etc.), la cual debe estar en perfecto estado. Los pasajeros deben presentarse en el lugar y horario de embarque indicados. La empresa no se responsabiliza por retrasos o ausencias de los pasajeros.
                </p>
                
                <h3 className="font-semibold text-foreground">5. Modificaciones</h3>
                <p>
                  Nos reservamos el derecho de modificar estos términos en cualquier momento. Te recomendamos revisar esta página periódicamente para estar al tanto de cualquier cambio.
                </p>

              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}
