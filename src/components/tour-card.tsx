import Image from "next/image"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import type { Tour } from "@/lib/types"
import { CalendarIcon, ArrowRight, Star } from "lucide-react"
import { getDisplayUrl } from "@/lib/utils"

interface TourCardProps {
  tour: Tour
  canPurchase?: boolean
}

export function TourCard({ tour, canPurchase = true }: TourCardProps) {
  const imageUrl = tour.backgroundImage || "https://placehold.co/400x300.png"
  const currencySymbol = tour.currency === 'USD' ? 'U$S' : '$'

  return (
    <Card className="w-full overflow-hidden transition-all duration-300 ease-in-out border border-border/60 rounded-2xl group hover:shadow-2xl hover:-translate-y-2 hover:border-primary/40 bg-card">
      <CardContent className="p-0">
        <Link href={`/booking/${tour.id}`} prefetch={false} className="block cursor-pointer">
          <div className="relative overflow-hidden">
            <Image
              src={getDisplayUrl(imageUrl)}
              alt={`Imagen de ${tour.destination}`}
              width={400}
              height={300}
              className="object-cover w-full h-56 transition-transform duration-500 group-hover:scale-105"
              data-ai-hint="travel destination"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

            {tour.isFeatured && (
              <div className="absolute top-3 left-3 flex items-center gap-1 bg-primary text-primary-foreground text-xs font-bold px-2.5 py-1 rounded-full shadow-lg">
                <Star className="w-3 h-3 fill-current" />
                DESTACADO
              </div>
            )}

            <div className="absolute top-3 right-3 bg-black/55 backdrop-blur-sm text-white text-sm font-bold px-2.5 py-1 rounded-xl shadow">
              {currencySymbol}{tour.price.toLocaleString('es-AR')}
            </div>

            <h3 className="absolute bottom-4 left-4 text-2xl font-headline text-white drop-shadow-lg leading-tight">{tour.destination}</h3>
          </div>
        </Link>

        <div className="p-5 space-y-3 bg-card">
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <CalendarIcon className="w-4 h-4 text-primary shrink-0" />
            <span>{new Date(tour.date).toLocaleDateString('es-AR', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
          </div>

          {tour.tags && tour.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {tour.tags.slice(0, 3).map(tag => (
                <span key={tag} className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                  {tag}
                </span>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between pt-1">
            <div>
              <p className="text-xs text-muted-foreground">Desde</p>
              <p className="text-3xl font-bold text-foreground">{currencySymbol}{tour.price.toLocaleString('es-AR')}</p>
            </div>
            {canPurchase ? (
              <Button asChild size="default" className="rounded-xl gap-2 group/btn">
                <Link href={`/booking/${tour.id}`} prefetch={false}>
                  Reservar
                  <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover/btn:translate-x-1" />
                </Link>
              </Button>
            ) : (
              <Button size="default" className="rounded-xl" disabled>
                No Disponible
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
