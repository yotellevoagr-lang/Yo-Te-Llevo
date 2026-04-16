"use client"

import Link from "next/link"
import { Logo } from "./logo"
import { Instagram, Facebook, Phone, Mail, MapPin } from "lucide-react"
import { useEffect, useState } from "react"
import type { GeneralSettings } from "@/lib/types"

const WhatsAppIcon = () => (
  <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-.88-.436-1.017-.486-.137-.05-.282-.075-.427.05-.145.122-.458.583-.563.708-.104.122-.208.147-.386.022-.178-.122-1.072-.368-2.04-1.25-.76-.695-1.27-1.558-1.417-1.823-.145-.265-.015-.422.104-.563.102-.125.232-.208.335-.308.102-.1.153-.175.231-.285.078-.11.038-.213-.015-.335-.053-.125-.478-1.153-.655-1.578-.172-.423-.348-.368-.478-.368h-.137c-.137 0-.358.05-.535.25-.178.2-.655.633-.655 1.538 0 .903.67 1.785.764 1.908.096.123 1.303 2.083 3.25 2.873.432.178.765.285 1.026.368.423.137.804.113.972.05.19-.075.583-.242.667-.478.083-.23.083-.448.058-.478-.025-.03-.149-.075-.323-.15z" />
    <path d="M12.002 2.002c-5.522 0-9.998 4.476-9.998 9.998 0 1.758.455 3.42 1.258 4.896L2 22l5.244-1.378c1.42.758 3.036 1.18 4.756 1.18 5.522 0 9.998-4.476 9.998-9.998s-4.476-9.998-9.998-9.998zm0 18.156c-1.603 0-3.14-.38-4.502-1.078l-.322-.192-3.35 1.042 1.058-3.264-.213-.342c-.75-1.205-1.153-2.61-1.153-4.088 0-4.524 3.67-8.198 8.198-8.198 4.524 0 8.198 3.674 8.198 8.198s-3.674 8.198-8.198 8.198z" />
  </svg>
)

export function SiteFooter() {
  const [settings, setSettings] = useState<GeneralSettings | null>(null)

  useEffect(() => {
    const cached = localStorage.getItem('ytl_general_settings')
    if (cached) {
      try { setSettings(JSON.parse(cached)) } catch {}
    }
    const handler = () => {
      const updated = localStorage.getItem('ytl_general_settings')
      if (updated) try { setSettings(JSON.parse(updated)) } catch {}
    }
    window.addEventListener('storage', handler)
    return () => window.removeEventListener('storage', handler)
  }, [])

  const instagram = settings?.contact?.instagram
  const facebook = settings?.contact?.facebook
  const whatsapp = settings?.mainWhatsappNumber
  const email = settings?.contact?.email
  const phone = settings?.contact?.phone
  const address = settings?.contact?.address

  const whatsappLink = whatsapp
    ? `https://wa.me/${whatsapp.replace(/\D/g, '')}`
    : null

  return (
    <footer className="bg-muted/40 border-t border-border w-full">
      <div className="container px-4 md:px-6 py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">

          <div className="space-y-4">
            <Logo />
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
              Tu agencia de viajes de confianza. Descubrí destinos increíbles con nosotros.
            </p>
            {(instagram || facebook || whatsappLink) && (
              <div className="flex items-center gap-2 pt-1">
                {instagram && (
                  <a href={instagram} target="_blank" rel="noopener noreferrer"
                    className="w-8 h-8 rounded-full bg-background border border-border flex items-center justify-center text-muted-foreground hover:text-[#E1306C] hover:border-[#E1306C] transition-colors">
                    <Instagram className="w-4 h-4" />
                  </a>
                )}
                {facebook && (
                  <a href={facebook} target="_blank" rel="noopener noreferrer"
                    className="w-8 h-8 rounded-full bg-background border border-border flex items-center justify-center text-muted-foreground hover:text-[#1877F2] hover:border-[#1877F2] transition-colors">
                    <Facebook className="w-4 h-4" />
                  </a>
                )}
                {whatsappLink && (
                  <a href={whatsappLink} target="_blank" rel="noopener noreferrer"
                    className="w-8 h-8 rounded-full bg-background border border-border flex items-center justify-center text-muted-foreground hover:text-[#25D366] hover:border-[#25D366] transition-colors">
                    <WhatsAppIcon />
                  </a>
                )}
              </div>
            )}
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground tracking-wide uppercase">Navegación</h3>
            <ul className="space-y-2">
              {[
                { href: '/', label: 'Inicio' },
                { href: '/tours', label: 'Viajes' },
                { href: '/flyers', label: 'Flyers' },
                { href: '/contact', label: 'Contacto' },
              ].map(({ href, label }) => (
                <li key={href}>
                  <Link href={href} prefetch={false}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {(phone || email || address || whatsapp) && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground tracking-wide uppercase">Contacto</h3>
              <ul className="space-y-2.5">
                {phone && (
                  <li className="flex items-start gap-2 text-sm text-muted-foreground">
                    <Phone className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <span>{phone}</span>
                  </li>
                )}
                {whatsapp && (
                  <li className="flex items-start gap-2 text-sm text-muted-foreground">
                    <WhatsAppIcon />
                    <span>{whatsapp}</span>
                  </li>
                )}
                {email && (
                  <li className="flex items-start gap-2 text-sm text-muted-foreground">
                    <Mail className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <span>{email}</span>
                  </li>
                )}
                {address && (
                  <li className="flex items-start gap-2 text-sm text-muted-foreground">
                    <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <span>{address}</span>
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-border">
        <div className="container px-4 md:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} YO TE LLEVO. Todos los derechos reservados.
          </p>
          <nav className="flex gap-4">
            <Link href="/terms" className="text-xs text-muted-foreground hover:text-primary transition-colors" prefetch={false}>
              Términos de Servicio
            </Link>
            <Link href="/privacy" className="text-xs text-muted-foreground hover:text-primary transition-colors" prefetch={false}>
              Política de Privacidad
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  )
}
