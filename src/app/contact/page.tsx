
"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Mail, Phone, MapPinIcon, Clock, Instagram, Facebook, QrCode } from "lucide-react"
import type { GeneralSettings } from "@/lib/types"
import { getDocumentById } from "@/lib/firestore-services"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Button } from "@/components/ui/button"

const InfoRow = ({ icon: Icon, label, value, href }: { icon: React.ElementType, label: string, value?: string, href?: string }) => {
    if (!value) return null;
    
    const content = href ? (
        <a href={href} target="_blank" rel="noopener noreferrer" className="hover:underline hover:text-primary break-all">
            {value}
        </a>
    ) : (
        <span className="break-all">{value}</span>
    );

    const isSocial = href && (href.includes('instagram') || href.includes('facebook'));
    
    return (
        <div className="flex items-start gap-4">
            <div className="flex-shrink-0 mt-1">
                <Icon className="w-5 h-5 text-primary" />
            </div>
            <div className="flex flex-col flex-1">
                <p className="font-semibold text-muted-foreground">{label}</p>
                <div className="flex items-center gap-2">
                    <p className="font-medium text-foreground">{content}</p>
                    {isSocial && (
                         <Popover>
                            <PopoverTrigger asChild>
                               <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground">
                                    <QrCode className="w-4 h-4" />
                               </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-2">
                                <Image
                                    src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(href)}`}
                                    alt={`QR para ${label}`}
                                    width={150}
                                    height={150}
                                />
                            </PopoverContent>
                        </Popover>
                    )}
                </div>
            </div>
        </div>
    )
}

export default function ContactPage() {
  const [settings, setSettings] = useState<GeneralSettings | null>(null);

  useEffect(() => {
    const fetchData = async () => {
        const storedSettings = await getDocumentById<GeneralSettings>('settings', 'general');
        if (storedSettings) {
            setSettings(storedSettings);
        }
    }
    fetchData();
  }, []);

  const contact = settings?.contact;

  return (
    <div className="flex flex-col min-h-screen">
      <SiteHeader />
      <main className="flex-1">
        <div className="container py-12 md:py-24">
          <div className="mx-auto max-w-2xl">
            <Card className="shadow-lg">
              <CardHeader className="text-center">
                <div className="flex justify-center mb-2">
                    <Mail className="w-10 h-10 text-primary" />
                </div>
                <CardTitle className="text-3xl font-headline">
                  Ponete en Contacto
                </CardTitle>
                 <p className="text-muted-foreground pt-2">
                  ¿Tenés dudas o consultas? Estamos para ayudarte.
                </p>
              </CardHeader>
              <CardContent className="space-y-8 pt-4">
                <div className="space-y-6 p-6 border bg-muted/20 rounded-lg">
                  <InfoRow icon={MapPinIcon} label="Dirección" value={contact?.address} />
                  <InfoRow icon={Phone} label="Teléfono" value={contact?.phone} href={`tel:${contact?.phone}`} />
                  <InfoRow icon={Mail} label="Email" value={contact?.email} href={`mailto:${contact?.email}`} />
                  <InfoRow icon={Clock} label="Horario de Atención" value={contact?.hours} />
                  <InfoRow icon={Instagram} label="Instagram" value={contact?.instagram?.split('?')[0]} href={contact?.instagram}/>
                  <InfoRow icon={Facebook} label="Facebook" value={contact?.facebook} href={contact?.facebook}/>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}
