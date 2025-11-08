
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
                  Última actualización: {new Date().toLocaleDateString('es-AR', { year: 'numeric', month: 'long', day: 'numeric' })}
                </CardDescription>
              </CardHeader>
              <CardContent className="prose prose-sm max-w-none text-muted-foreground space-y-4">
                <p>
                  En YO TE LLEVO ("La Agencia", "Nosotros"), estamos comprometidos con la protección y el respeto de su privacidad. Esta Política de Privacidad explica cómo recopilamos, utilizamos, almacenamos y protegemos su información personal cuando utiliza nuestro sitio web ("Sitio Web") y nuestros servicios.
                </p>
                
                <h3 className="font-semibold text-foreground">1. Información que Recopilamos</h3>
                <p>
                  Recopilamos información para poder brindarle el mejor servicio posible. Esto incluye:
                </p>
                <ul>
                    <li><strong>Información proporcionada por usted:</strong> Cuando se registra, solicita una reserva o se comunica con nosotros, nos proporciona datos como su nombre completo, número de DNI, fecha de nacimiento, correo electrónico, número de teléfono y, opcionalmente, su dirección.</li>
                    <li><strong>Información de la reserva:</strong> Detalles sobre los viajes que reserva, incluyendo destinos, fechas, acompañantes y preferencias de servicio.</li>
                    <li><strong>Información técnica y de uso:</strong> Recopilamos automáticamente información sobre cómo interactúa con nuestro Sitio Web, como su dirección IP, tipo de navegador, páginas visitadas y la duración de su visita.</li>
                </ul>

                <h3 className="font-semibold text-foreground">2. Cómo Utilizamos su Información</h3>
                <p>
                  Su información personal se utiliza para los siguientes propósitos:
                </p>
                <ul>
                    <li><strong>Provisión del servicio:</strong> Para procesar y gestionar sus reservas, emitir documentación de viaje y comunicarnos con usted acerca de los detalles de su viaje.</li>
                    <li><strong>Comunicación:</strong> Para responder a sus consultas, enviarle confirmaciones, notificaciones importantes sobre sus viajes y, si lo autoriza, enviarle ofertas promocionales y novedades.</li>
                    <li><strong>Cumplimiento Legal:</strong> Para cumplir con las obligaciones legales y los requisitos de seguridad exigidos por autoridades y proveedores de servicios (ej. listas de pasajeros para aerolíneas, hoteles, seguros, etc.).</li>
                    <li><strong>Mejora del Servicio:</strong> Para analizar el uso de nuestro Sitio Web y servicios con el fin de mejorar la experiencia del usuario, optimizar nuestra oferta y desarrollar nuevos productos.</li>
                    <li><strong>Seguridad:</strong> Para proteger la seguridad de su cuenta y prevenir fraudes.</li>
                </ul>

                <h3 className="font-semibold text-foreground">3. Cómo Compartimos su Información</h3>
                <p>
                  Su privacidad es fundamental. No vendemos ni alquilamos su información personal. Solo compartimos su información con terceros en las siguientes circunstancias:
                </p>
                 <ul>
                    <li><strong>Proveedores de Servicios Turísticos:</strong> Compartimos la información necesaria (nombre, DNI, fecha de nacimiento) con hoteles, compañías de transporte, aseguradoras y otros operadores turísticos para poder efectuar su reserva.</li>
                    <li><strong>Requisitos Legales:</strong> Si es requerido por ley, una orden judicial o una solicitud gubernamental, podremos divulgar su información.</li>
                    <li><strong>Protección de Derechos:</strong> Podemos compartir información si creemos que es necesario para proteger nuestros derechos, nuestra propiedad o la seguridad de nuestros clientes o del público.</li>
                </ul>
                
                <h3 className="font-semibold text-foreground">4. Seguridad y Almacenamiento de Datos</h3>
                 <p>
                  Tomamos medidas de seguridad técnicas y organizativas para proteger su información personal contra la pérdida, el uso indebido, el acceso no autorizado, la divulgación y la alteración. Utilizamos bases de datos seguras y cifrado para proteger la información sensible. Su información se almacena durante el tiempo que sea necesario para cumplir con los fines descritos en esta política y para cumplir con nuestras obligaciones legales.
                </p>

                <h3 className="font-semibold text-foreground">5. Sus Derechos de Protección de Datos</h3>
                <p>
                  De acuerdo con la Ley de Protección de Datos Personales N.º 25.326, usted tiene los siguientes derechos sobre su información:
                </p>
                <ul>
                    <li><strong>Derecho de Acceso:</strong> Puede solicitar una copia de la información personal que tenemos sobre usted.</li>
                    <li><strong>Derecho de Rectificación:</strong> Puede solicitar que corrijamos cualquier información que considere inexacta o incompleta.</li>
                    <li><strong>Derecho de Supresión:</strong> Puede solicitar que eliminemos su información personal, sujeto a ciertas obligaciones legales de retención.</li>
                </ul>
                 <p>
                  Para ejercer cualquiera de estos derechos, por favor, inicie sesión y vaya a la sección "Mi Perfil" o contáctenos a través de los datos proporcionados en nuestra página de contacto.
                </p>

                <h3 className="font-semibold text-foreground">6. Uso de Cookies</h3>
                <p>
                    Nuestro Sitio Web utiliza cookies y tecnologías similares para mejorar su experiencia de navegación, personalizar el contenido, analizar el tráfico del sitio y recordar sus preferencias.
                </p>
                <h4>¿Qué son las Cookies?</h4>
                <p>
                    Las cookies son pequeños archivos de texto que los sitios web que visita colocan en su dispositivo. Son ampliamente utilizadas para que los sitios web funcionen, o funcionen de manera más eficiente, así como para proporcionar información a los propietarios del sitio.
                </p>
                <h4>¿Cómo utilizamos las Cookies?</h4>
                <ul>
                    <li><strong>Cookies Esenciales:</strong> Son estrictamente necesarias para proporcionarle los servicios disponibles a través de nuestro Sitio Web y para usar algunas de sus funciones, como el acceso a áreas seguras (inicio de sesión).</li>
                    <li><strong>Cookies de Funcionalidad:</strong> Se utilizan para recordar las elecciones que hace en nuestro sitio, como su idioma de preferencia o la configuración del tema visual.</li>
                    <li><strong>Cookies de Rendimiento y Análisis:</strong> Recopilan información sobre cómo los usuarios interactúan con nuestro sitio, qué páginas visitan con más frecuencia, etc. Esta información nos ayuda a mejorar el funcionamiento de nuestro sitio web.</li>
                </ul>
                 <h4>Cómo Gestionar las Cookies</h4>
                <p>
                    Usted tiene el derecho de decidir si acepta o rechaza las cookies. Puede ejercer sus preferencias de cookies configurando o modificando los controles de su navegador web. Si elige rechazar las cookies, es posible que algunas funcionalidades y características de nuestro sitio no funcionen correctamente.
                </p>
                
                <h3 className="font-semibold text-foreground">7. Cambios a esta Política de Privacidad</h3>
                <p>
                  Podemos actualizar esta política de privacidad periódicamente para reflejar cambios en nuestras prácticas o por otras razones operativas, legales o regulatorias. Le recomendamos que revise esta página con frecuencia para estar informado sobre cómo protegemos su información.
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
