

"use client"
import { useMemo, useState, useEffect, useRef } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { Button } from "@/components/ui/button"
import { TourCard } from "@/components/tour-card"
import { MapPinIcon, ArrowRight, PlaneIcon, SparklesIcon, Search } from "lucide-react"
import type { Tour, GeneralSettings, GalleryItem, AboutUsBlock } from "@/lib/types"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { SearchableSelect } from "@/components/searchable-select"

import { useToast } from "@/hooks/use-toast"
import { cn, getDisplayUrl } from "@/lib/utils"
import { useTranslation } from "react-i18next"
import { getAllFromCollection_client, getDocumentById } from "@/lib/firestore-services"
import { FeaturedTripPopup } from "@/components/featured-trip-popup"

const Slideshow = ({ items }: { items: { id: string; image: string; destination: string }[] }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    const resetTimeout = () => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
    };

    useEffect(() => {
        resetTimeout();
        if (items.length > 1) {
            timeoutRef.current = setTimeout(
                () => setCurrentIndex((prevIndex) => (prevIndex === items.length - 1 ? 0 : prevIndex + 1)),
                5000 // Change slide every 5 seconds
            );
        }
        return () => {
            resetTimeout();
        };
    }, [currentIndex, items.length]);

    if (items.length === 0) {
      return (
         <Image
            src="https://placehold.co/1920x1080/000000/FFFFFF.png?text=YO+TE+LLEVO"
            alt="YO TE LLEVO"
            fill
            className="brightness-[0.6] object-cover"
            data-ai-hint="travel agency hero"
            priority
          />
      );
    }

    return (
        <div className="absolute inset-0 z-[-1] overflow-hidden">
            {items.map((item, index) => {
                const imageUrl = getDisplayUrl(item.image);
                if (!imageUrl) return null;
                return (
                    <Image
                        key={item.id}
                        src={imageUrl}
                        alt={item.destination}
                        fill
                        className={cn(
                            "brightness-[0.6] transition-opacity duration-1000 ease-in-out object-cover",
                            index === currentIndex ? "opacity-100" : "opacity-0"
                        )}
                        priority={index === 0}
                    />
                );
            })}
        </div>
    );
};


export default function Home() {
  const [tours, setTours] = useState<Tour[]>([])
  const [generalSettings, setGeneralSettings] = useState<GeneralSettings | null>(null);
  const router = useRouter()
  const { toast } = useToast();
  const { t } = useTranslation();

  const loadData = async () => {
    const toursData = await getAllFromCollection_client<Tour>('tours');
    const settingsData = await getDocumentById<GeneralSettings>('settings', 'general');

    const processedTours = toursData.map(t => {
      const date = (t.date as any)?.toDate ? (t.date as any).toDate() : new Date(t.date);
      return { ...t, date };
    });

    setTours(processedTours);
    setGeneralSettings(settingsData);
  };

  useEffect(() => {
    loadData();
    // Listen for the custom storage event
    window.addEventListener('storage', loadData);
    // Cleanup listener on component unmount
    return () => {
      window.removeEventListener('storage', loadData);
    };
  }, [])

  const activeTours = useMemo(() => {
    if (!tours.length) return [];
    return tours.filter(tour => tour.isPublic && tour.date && new Date(tour.date) >= new Date());
  }, [tours]);
  
  const featuredTours = useMemo(() => {
    return activeTours.filter(tour => tour.isFeatured);
  }, [activeTours]);

  const popupTours = useMemo(() => {
    return featuredTours.filter(tour => tour.showAsPopup);
  }, [featuredTours]);
  
  const destinationOptions = useMemo(() => {
    return activeTours.map(tour => ({
      value: tour.id,
      label: tour.destination,
      price: tour.price,
      currency: tour.currency
    }));
  }, [activeTours]);
  
  const handleDestinationSelect = (tourId: string) => {
    if (tourId && destinationOptions.some(opt => opt.value === tourId)) {
      router.push(`/booking/${tourId}`)
    }
  }

 const carouselItems = useMemo(() => {
    return activeTours
      .map(tour => {
        const image = tour.backgroundImage;
        if (!image) return null;
        return {
          id: tour.id,
          image: image,
          destination: tour.destination,
        };
      })
      .filter((item): item is { id: string; image: string; destination: string } => item !== null);
  }, [activeTours]);

  return (
    <div className="flex flex-col min-h-screen">
      <SiteHeader />
      <FeaturedTripPopup tours={popupTours} />
      <main className="flex-1">
        <section className="relative w-full h-[80vh] md:h-[90vh] flex items-center justify-center text-center text-white">
           <Slideshow items={carouselItems} />

          <div className="container px-4 md:px-6 z-10">
            <h1 className="text-4xl sm:text-5xl font-headline tracking-tight md:text-7xl drop-shadow-2xl animate-fade-in-down">
              {t('hero.title')}
            </h1>
            <p className="max-w-3xl mx-auto mt-4 text-lg md:text-xl text-white/90 drop-shadow-lg animate-fade-in-down " style={{ animationDelay: '0.2s' }}>
              {t('hero.subtitle')}
            </p>
            <div className="max-w-xl mx-auto mt-8 animate-fade-in-up overflow-visible" style={{ animationDelay: '0.4s' }}>
              <div className="flex flex-col gap-4 p-4 rounded-2xl shadow-2xl bg-background/80 backdrop-blur-lg border border-white/20">
                 <div className="relative">
                    <MapPinIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-primary" />
                    <SearchableSelect
                      options={destinationOptions}
                      value={""}
                      onChange={handleDestinationSelect}
                      placeholder={t('hero.destination_placeholder')}
                    />
                 </div>
              </div>
            </div>
          </div>
        </section>

        {featuredTours.length > 0 && (
            <section className="w-full py-16 md:py-24 lg:py-32 bg-secondary/30">
              <div className="container px-4 md:px-6">
                <div className="flex flex-col items-center justify-center space-y-4 text-center">
                  <div className="space-y-2">
                     <div className="inline-block px-4 py-1 text-sm font-semibold tracking-wider rounded-full bg-primary/10 text-primary">
                      {t('featured.badge')}
                    </div>
                    <h2 className="text-3xl md:text-4xl font-bold tracking-tighter sm:text-5xl font-headline text-primary">{t('featured.title')}</h2>
                    <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                      {t('featured.subtitle')}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-8 py-12 md:grid-cols-2 lg:grid-cols-3">
                  {featuredTours.map((tour, i) => (
                    <div key={tour.id} className="animate-fade-in-up" style={{ animationDelay: `${0.2 * (i + 1)}s` }}>
                        <TourCard tour={tour} />
                    </div>
                  ))}
                </div>
                <div className="flex justify-center">
                  <Link href="/tours">
                    <Button variant="outline" size="lg" className="text-base">
                      {t('featured.view_all')}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                </div>
              </div>
            </section>
        )}

        <section className="container py-16 md:py-24">
            <div className="grid items-center gap-12 md:grid-cols-2">
                <div className="animate-fade-in-up">
                    <div className="inline-block px-4 py-1 text-sm font-semibold tracking-wider rounded-full bg-primary/10 text-primary">
                        {generalSettings?.aboutUsText?.badge || t('about.badge')}
                    </div>
                    <h2 className="mt-4 text-3xl md:text-4xl font-bold tracking-tighter font-headline text-primary sm:text-5xl">{generalSettings?.aboutUsText?.title || t('about.title')}</h2>
                    {generalSettings?.aboutUsText?.blocks && generalSettings.aboutUsText.blocks.length > 0 ? (
                        <div className="mt-4 space-y-3">
                            {generalSettings.aboutUsText.blocks.map((block: AboutUsBlock) =>
                                block.type === 'subtitle' ? (
                                    <h3
                                        key={block.id}
                                        className="text-xl font-bold text-primary mt-5"
                                        style={block.color ? { color: block.color } : undefined}
                                        dangerouslySetInnerHTML={{ __html: block.text }}
                                    />
                                ) : block.type === 'paragraph' ? (
                                    <div
                                        key={block.id}
                                        className="text-lg text-muted-foreground rich-text"
                                        style={block.color ? { color: block.color } : undefined}
                                        dangerouslySetInnerHTML={{ __html: block.text }}
                                    />
                                ) : (
                                    <div key={block.id} className="flex items-center gap-2" style={block.color ? { color: block.color } : undefined}>
                                        {block.icon && <span className="text-xl">{block.icon}</span>}
                                        {block.text && <span className="font-medium rich-text" dangerouslySetInnerHTML={{ __html: block.text }} />}
                                    </div>
                                )
                            )}
                        </div>
                    ) : (
                        <>
                            <p className="mt-4 text-lg text-muted-foreground">
                                {generalSettings?.aboutUsText?.p1 || t('about.p1')}
                            </p>
                            <p className="mt-4 text-lg text-muted-foreground">
                                {generalSettings?.aboutUsText?.p2 || t('about.p2')}
                            </p>
                            <div className="mt-8 flex flex-col sm:flex-row gap-4">
                                <div className="flex items-center gap-2"><PlaneIcon className="w-5 h-5 text-primary" /><span>{generalSettings?.aboutUsText?.feature1 || t('about.feature1')}</span></div>
                                <div className="flex items-center gap-2"><SparklesIcon className="w-5 h-5 text-primary" /><span>{generalSettings?.aboutUsText?.feature2 || t('about.feature2')}</span></div>
                            </div>
                        </>
                    )}
                </div>
                <div className="relative w-full h-80 lg:h-96 animate-fade-in-up" style={{ animationDelay: "0.2s"}}>
                    {generalSettings?.aboutUsMedia && getDisplayUrl(generalSettings.aboutUsMedia.url) ? (
                        generalSettings.aboutUsMedia.type === 'video' ? (
                            <video
                                src={getDisplayUrl(generalSettings.aboutUsMedia.url)}
                                autoPlay
                                loop
                                muted
                                playsInline
                                className="w-full h-full object-cover rounded-2xl shadow-2xl"
                            />
                        ) : (
                            <Image src={getDisplayUrl(generalSettings.aboutUsMedia.url)} alt="Sobre Nosotros" className="object-cover rounded-2xl shadow-2xl" fill data-ai-hint="happy travelers" />
                        )
                    ) : (
                        <Image src="https://placehold.co/600x400.png" alt="Grupo de amigos viajando" className="object-cover rounded-2xl shadow-2xl" fill data-ai-hint="friends traveling" />
                    )}
                </div>
            </div>
        </section>

      </main>
      <SiteFooter />
    </div>
  )
}
