
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
                  Términos y Condiciones Generales del Servicio
                </CardTitle>
                 <CardDescription>
                  Última actualización: {new Date().toLocaleDateString('es-AR', { year: 'numeric', month: 'long', day: 'numeric' })}
                </CardDescription>
              </CardHeader>
              <CardContent className="prose prose-sm max-w-none text-muted-foreground space-y-4">
                <p>
                  Bienvenido a YO TE LLEVO. Le solicitamos leer detenidamente los siguientes Términos y Condiciones antes de utilizar nuestro sitio web y contratar nuestros servicios. Al acceder y utilizar este sitio, usted reconoce y acepta estar legalmente vinculado por estos términos.
                </p>
                
                <h3 className="font-semibold text-foreground">1. Definiciones</h3>
                <ul>
                    <li><strong>"La Agencia"</strong>, <strong>"Nosotros"</strong>, <strong>"Nuestro"</strong>: Se refiere a YO TE LLEVO.</li>
                    <li><strong>"Cliente"</strong>, <strong>"Usted"</strong>, <strong>"Pasajero"</strong>: Se refiere a la persona que utiliza nuestro sitio web y/o contrata nuestros servicios turísticos.</li>
                    <li><strong>"Servicios"</strong>: Incluye la organización, intermediación y venta de paquetes turísticos, excursiones, transporte y otros servicios relacionados ofrecidos en nuestro sitio web.</li>
                    <li><strong>"Sitio Web"</strong>: Se refiere al dominio y todas las páginas bajo la marca YO TE LLEVO.</li>
                </ul>

                <h3 className="font-semibold text-foreground">2. Aceptación de los Términos</h3>
                <p>
                  El uso de este Sitio Web y la contratación de cualquiera de nuestros Servicios constituyen la aceptación plena y sin reservas de todos y cada uno de los Términos y Condiciones aquí expuestos. Si no está de acuerdo con estos términos, le rogamos que no utilice nuestro Sitio Web ni nuestros Servicios.
                </p>

                <h3 className="font-semibold text-foreground">3. Proceso de Reserva y Contratación</h3>
                <ol>
                    <li><strong>Solicitud de Reserva:</strong> El Cliente puede iniciar una solicitud de reserva a través de nuestro Sitio Web, proporcionando la información requerida de manera veraz y completa. Esta solicitud no constituye una confirmación de la reserva.</li>
                    <li><strong>Confirmación y Pago:</strong> Un representante de La Agencia se pondrá en contacto con el Cliente para coordinar los métodos de pago y confirmar la disponibilidad. La reserva se considerará firme y confirmada únicamente tras la recepción del pago acordado (sea total o parcial, según se especifique).</li>
                    <li><strong>Documentación:</strong> Una vez confirmada la reserva, La Agencia proporcionará al Cliente la documentación pertinente, como vouchers, itinerarios y pases de abordo, según corresponda.</li>
                </ol>

                <h3 className="font-semibold text-foreground">4. Precios, Pagos y Moneda</h3>
                <ul>
                    <li>Los precios publicados en el Sitio Web están expresados en la moneda indicada y están sujetos a disponibilidad y posibles modificaciones sin previo aviso hasta el momento de la confirmación del pago.</li>
                    <li>Los precios incluyen únicamente los servicios especificados en la descripción de cada paquete turístico. Cualquier servicio no detallado explícitamente (ej: comidas no especificadas, excursiones opcionales, tasas locales) no está incluido.</li>
                    <li>La Agencia acepta diversos métodos de pago que serán comunicados por nuestro personal de ventas al momento de la confirmación.</li>
                </ul>

                <h3 className="font-semibold text-foreground">5. Política de Cancelación y Modificación</h3>
                <ul>
                    <li><strong>Por parte del Cliente:</strong> Las políticas de cancelación varían según el paquete turístico, el proveedor final (aerolínea, hotel, etc.) y la antelación con la que se solicite. Dicha política será informada al Cliente antes de la confirmación del pago y estará detallada, cuando aplique, en la descripción del viaje. La Agencia podrá retener gastos administrativos y/o penalidades impuestas por los proveedores.</li>
                    <li><strong>Por parte de La Agencia:</strong> La Agencia se reserva el derecho de modificar o cancelar un viaje por causas de fuerza mayor, caso fortuito, o si no se alcanza el número mínimo de pasajeros requerido. En tales casos, La Agencia ofrecerá alternativas como la reprogramación del viaje o el reembolso de los importes abonados, sin que ello implique derecho a indemnización adicional alguna para el Cliente.</li>
                </ul>

                <h3 className="font-semibold text-foreground">6. Responsabilidades del Pasajero</h3>
                <ul>
                    <li>Es responsabilidad exclusiva del Pasajero poseer toda la documentación personal necesaria para el viaje (DNI, pasaporte, visas, certificados de vacunación, etc.), la cual debe estar vigente y en perfecto estado.</li>
                    <li>El Pasajero debe presentarse en el lugar y horario indicados para el embarque. La no presentación o la llegada tardía (no-show) resultará en la pérdida total de los servicios contratados, sin derecho a reembolso.</li>
                    <li>El Pasajero se compromete a respetar las normas y el comportamiento adecuado durante el viaje, siguiendo las indicaciones del coordinador y respetando a los demás miembros del grupo.</li>
                </ul>
                
                <h3 className="font-semibold text-foreground">7. Limitación de Responsabilidad de la Agencia</h3>
                <p>
                  La Agencia actúa como intermediaria entre el Cliente y los proveedores de servicios (transportistas, hoteles, etc.), por lo que no es responsable por incumplimientos, accidentes, daños, pérdidas o cualquier irregularidad que pudiera ocurrir por parte de dichos proveedores. No obstante, La Agencia brindará toda la asistencia necesaria para gestionar cualquier inconveniente.
                </p>

                <h3 className="font-semibold text-foreground">8. Propiedad Intelectual</h3>
                <p>
                  Todo el contenido presente en el Sitio Web, incluyendo textos, gráficos, logos, imágenes y software, es propiedad de YO TE LLEVO o de sus proveedores de contenido y está protegido por las leyes de propiedad intelectual. Queda prohibida su reproducción, modificación o distribución sin nuestra autorización explícita.
                </p>

                <h3 className="font-semibold text-foreground">9. Modificación de los Términos</h3>
                <p>
                  La Agencia se reserva el derecho de revisar y modificar estos Términos y Condiciones en cualquier momento. La versión actualizada será publicada en esta página y entrará en vigor inmediatamente. Es responsabilidad del Cliente revisar periódicamente estos términos.
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
