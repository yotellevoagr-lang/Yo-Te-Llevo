import Image from "next/image"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import type { Tour } from "@/lib/types"
import { CalendarIcon, ArrowRight } from "lucide-react"
import { getDisplayUrl } from "@/lib/utils"

interface TourCardProps {
  tour: Tour
  canPurchase?: boolean
}

export function TourCard({ tour, canPurchase = true }: TourCardProps) {
  const imageUrl = tour.backgroundImage || "https://placehold.co/400x300.png";
  const currencySymbol = tour.currency === 'USD' ? 'U$S' : '$';

  return (
      <Card className="w-full overflow-hidden transition-all duration-300 ease-in-out border-2 border-transparent rounded-2xl group hover:shadow-2xl hover:border-primary hover:-translate-y-2">
        <CardContent className="p-0">
          <Link href={`/booking/${tour.id}`} prefetch={false} className="block cursor-pointer">
            <div className="relative overflow-hidden">
              <Image
                  src={getDisplayUrl(imageUrl)}
                  alt={`Imagen de ${tour.destination}`}
                  width={400}
                  height={300}
                  className="object-cover w-full h-56 transition-transform duration-500 group-hover:scale-110"
                  data-ai-hint="travel destination"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent"></div>
              <h3 className="absolute bottom-4 left-4 text-3xl font-headline text-white drop-shadow-lg">{tour.destination}</h3>
            </div>
          </Link>
          <div className="p-6 space-y-4 bg-card">
            <div className="flex items-center gap-4 text-muted-foreground">
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-primary" />
                <span className="font-medium text-foreground/80">{new Date(tour.date).toLocaleDateString('es-AR', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
              </div>
            </div>
            <div className="flex items-end justify-between pt-4">
              <div>
                <p className="text-sm text-muted-foreground">Desde</p>
                <p className="text-4xl font-bold text-foreground">{currencySymbol}{tour.price.toLocaleString('es-AR')}</p>
              </div>
              {canPurchase ? (
                <Button asChild size="lg" className="text-base rounded-xl">
                    <Link href={`/booking/${tour.id}`} prefetch={false}>
                      Reservar
                      <ArrowRight className="w-4 h-4 ml-2 transition-transform duration-300 group-hover:translate-x-1" />
                    </Link>
                </Button>
              ) : (
                 <Button size="lg" className="text-base rounded-xl" disabled>
                    No Disponible
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
  );
}