
"use client"

import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

export default function PrivacyPolicyPage() {
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
                  Política de Privacidad
                </CardTitle>
                 <CardDescription>
                  En YO TE LLEVO, tu privacidad es nuestra prioridad.
                </CardDescription>
              </CardHeader>
              <CardContent className="prose prose-sm max-w-none text-muted-foreground space-y-4">
                <p>
                  Esta Política de Privacidad describe cómo se recopila, utiliza y comparte tu información personal cuando visitas o realizas una compra en nuestro sitio web.
                </p>
                
                <h3 className="font-semibold text-foreground">1. Información Personal que Recopilamos</h3>
                <p>
                  Cuando te registras, realizas una reserva o te pones en contacto con nosotros, recopilamos cierta información tuya, incluyendo tu nombre, DNI, fecha de nacimiento, información de contacto (como email y número de teléfono) y, en algunos casos, detalles de pago.
                </p>

                <h3 className="font-semibold text-foreground">2. Cómo Usamos tu Información Personal</h3>
                <p>
                  Utilizamos la información que recopilamos para:
                </p>
                <ul>
                    <li>Procesar y gestionar tus reservas de viaje.</li>
                    <li>Comunicarnos contigo acerca de tu reserva y otros servicios.</li>
                    <li>Cumplir con los requisitos legales y de seguridad de los proveedores de transporte y alojamiento.</li>
                    <li>Mejorar y optimizar nuestro sitio web y servicios.</li>
                    <li>Enviarte información promocional, si has dado tu consentimiento para recibirla.</li>
                </ul>

                <h3 className="font-semibold text-foreground">3. Compartir tu Información Personal</h3>
                <p>
                  No compartimos tu Información Personal con terceros, excepto para los fines de cumplir con tu reserva (por ejemplo, con aerolíneas, hoteles o seguros de viaje) o para cumplir con las leyes y regulaciones aplicables.
                </p>
                 
                <h3 className="font-semibold text-foreground">4. Tus Derechos</h3>
                <p>
                  Tienes derecho a acceder a la información personal que tenemos sobre ti y a pedir que tu información personal sea corregida, actualizada o eliminada. Si deseas ejercer este derecho, por favor contáctanos.
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
