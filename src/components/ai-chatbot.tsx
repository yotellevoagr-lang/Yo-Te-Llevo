"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Bot, User, Send, RotateCcw, MessageCircle, Calendar, MapPin, Eye,
  Ticket, Phone, Mail, Instagram, Facebook, Map, ExternalLink,
  Cloud, Thermometer, Droplets, ArrowLeftRight, Image as ImageIcon,
  DollarSign, Star, Filter, X, Sparkles, Clock
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useAuth } from "@/components/auth/auth-provider";
import { getAllFromCollection_client } from "@/lib/firestore-services";
import type { Reservation } from "@/lib/types";

const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M17.472 14.382c-.297-.149-.88-.436-1.017-.486-.137-.05-.282-.075-.427.05-.145.122-.458.583-.563.708-.104.122-.208.147-.386.022-.178-.122-1.072-.368-2.04-1.25-.76-.695-1.27-1.558-1.417-1.823-.145-.265-.015-.422.104-.563.102-.125.232-.208.335-.308.102-.1.153-.175.231-.285.078-.11.038-.213-.015-.335-.053-.125-.478-1.153-.655-1.578-.172-.423-.348-.368-.478-.368h-.137c-.137 0-.358.05-.535.25-.178.2-.655.633-.655 1.538 0 .903.67 1.785.764 1.908.096.123 1.303 2.083 3.25 2.873.432.178.765.285 1.026.368.423.137.804.113.972.05.19-.075.583-.242.667-.478.083-.23.083-.448.058-.478-.025-.03-.149-.075-.323-.15z"/>
    <path d="M12.002 2.002c-5.522 0-9.998 4.476-9.998 9.998 0 1.758.455 3.42 1.258 4.896L2 22l5.244-1.378c1.42.758 3.036 1.18 4.756 1.18 5.522 0 9.998-4.476 9.998-9.998s-4.476-9.998-9.998-9.998zm0 18.156c-1.603 0-3.14-.38-4.502-1.078l-.322-.192-3.35 1.042 1.058-3.264-.213-.342c-.75-1.205-1.153-2.61-1.153-4.088 0-4.524 3.67-8.198 8.198-8.198 4.524 0 8.198 3.674 8.198 8.198s-3.674 8.198-8.198 8.198z"/>
  </svg>
);

interface TourData {
  id: string;
  destination: string;
  date: string;
  price: number;
  currency: string;
  days?: number;
  nights?: number;
  backgroundImage?: string;
  gallery?: { url: string; type: string }[];
  isFeatured?: boolean;
  availableSeats?: number;
  tags?: string[];
  description?: string;
  cancellationPolicy?: string;
  departureTime?: string;
  departurePoint?: string;
}

interface WeatherData {
  city: string;
  temp: string;
  feelsLike: string;
  desc: string;
  humidity: string;
  forecast: string;
}

interface LinkData {
  text: string;
  url: string;
  icon?: string;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  tours?: TourData[];
  links?: LinkData[];
  media?: { type: 'image' | 'video'; url: string };
  weather?: WeatherData;
  isComparison?: boolean;
}

const getLinkIcon = (icon?: string) => {
  switch (icon) {
    case 'whatsapp': return <WhatsAppIcon className="h-4 w-4" />;
    case 'phone': return <Phone className="h-4 w-4" />;
    case 'email': return <Mail className="h-4 w-4" />;
    case 'instagram': return <Instagram className="h-4 w-4" />;
    case 'facebook': return <Facebook className="h-4 w-4" />;
    case 'map': return <Map className="h-4 w-4" />;
    default: return <ExternalLink className="h-4 w-4" />;
  }
};

const WELCOME_MESSAGE = "¡Hola! 👋 Soy el asistente virtual de YO TE LLEVO.\n\nPuedo ayudarte a encontrar el viaje perfecto, comparar opciones, ver el clima en el destino, recomendarte según tu presupuesto y mucho más. ¿Por dónde empezamos?";

export default function AIChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [whatsappNumber, setWhatsappNumber] = useState<string | null>(null);
  const [galleryOpen, setGalleryOpen] = useState<{ tourId: string; idx: number } | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const scrollToBottom = () => {
    if (scrollAreaRef.current) {
      const viewport = scrollAreaRef.current.querySelector('div[data-radix-scroll-area-viewport]');
      if (viewport) {
        setTimeout(() => { viewport.scrollTop = viewport.scrollHeight; }, 100);
      }
    }
  };

  useEffect(() => { scrollToBottom(); }, [messages, isLoading]);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([{ role: "assistant", content: WELCOME_MESSAGE }]);
    }
  }, [isOpen, messages.length]);

  // Cargar número de WhatsApp para el botón del header
  useEffect(() => {
    try {
      const cachedGeneral = localStorage.getItem("ytl_general_settings");
      if (cachedGeneral) {
        const parsed = JSON.parse(cachedGeneral);
        if (parsed?.mainWhatsappNumber) {
          setWhatsappNumber(String(parsed.mainWhatsappNumber).replace(/\D/g, ''));
          return;
        }
      }
    } catch {
      // ignore
    }
    if (typeof navigator !== 'undefined' && !navigator.onLine) return;
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'yo-te-llevo-1021c';
    if (!projectId) return;
    fetch(`https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/settings/general`)
      .then(r => r.json())
      .then(d => {
        const num = d?.fields?.mainWhatsappNumber?.stringValue;
        if (num) setWhatsappNumber(num.replace(/\D/g, ''));
      }).catch(() => {});
  }, []);

  const buildUserContext = async () => {
    if (authLoading || !user) return undefined;
    try {
      const allRes = await getAllFromCollection_client<Reservation>('reservations');
      const myRes = allRes.filter(r =>
        Array.isArray((r as any).passengerIds) && (r as any).passengerIds.includes(user.id)
      );
      const pastDest: string[] = [];
      const upcomingDest: string[] = [];
      const now = new Date();
      for (const res of myRes) {
        const trip = (res as any);
        if (trip.destination) {
          if (trip.tripDate && new Date(trip.tripDate?.toDate?.() || trip.tripDate) < now) {
            pastDest.push(trip.destination);
          } else {
            upcomingDest.push(trip.destination);
          }
        }
      }
      return {
        name: (user as any).name || (user as any).firstName || undefined,
        pastDestinations: [...new Set(pastDest)],
        upcomingDestinations: [...new Set(upcomingDest)],
      };
    } catch {
      return { name: (user as any).name || (user as any).firstName || undefined };
    }
  };

  const sendMessage = async (overrideInput?: string) => {
    const text = (overrideInput ?? input).trim();
    if (!text || isLoading) return;
    setInput("");

    const newMessages: Message[] = [...messages, { role: "user", content: text }];
    setMessages(newMessages);

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setMessages(prev => [
        ...prev,
        {
          role: "assistant",
          content: "En este momento estás sin conexión a internet y el asistente virtual requiere conexión para responder.\n\nMientras tanto, podés ver los viajes ya cargados y realizar tus reservas con normalidad; se sincronizarán automáticamente cuando vuelva la conexión.",
        },
      ]);
      return;
    }

    setIsLoading(true);

    try {
      const userContext = await buildUserContext();

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map(m => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            content: m.content
          })),
          userContext,
        }),
      });

      const data = await response.json();

      if (data.success && data.message) {
        setMessages(prev => [...prev, {
          role: "assistant",
          content: data.message,
          tours: data.tours || undefined,
          links: data.links || undefined,
          media: data.media || undefined,
          weather: data.weather || undefined,
          isComparison: data.isComparison || false,
        }]);
      } else {
        setMessages(prev => [...prev, {
          role: "assistant",
          content: data.error || "Lo siento, hubo un problema. Por favor, intenta de nuevo."
        }]);
      }
    } catch {
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "Lo siento, no pude procesar tu mensaje. Verificá tu conexión e intenta de nuevo."
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const resetChat = () => {
    setMessages([{ role: "assistant", content: WELCOME_MESSAGE }]);
  };

  const handleViewTour = (tourId: string) => {
    router.push(`/booking/${tourId}`);
    setIsOpen(false);
  };

  const handleLinkClick = (url: string) => {
    if (url.startsWith('/')) { router.push(url); setIsOpen(false); }
    else window.open(url, '_blank');
  };

  const formatTourDate = (dateStr: string) => {
    try { return format(new Date(dateStr), "d 'de' MMMM", { locale: es }); }
    catch { return dateStr; }
  };

  const formatPrice = (price: number, currency: string) =>
    currency === 'USD' ? `USD $${price.toLocaleString()}` : `$${price.toLocaleString()}`;

  const openWhatsApp = () => {
    if (!whatsappNumber) return;
    const lastTours = messages.filter(m => m.tours?.length).slice(-1)[0]?.tours;
    const tourMsg = lastTours?.length === 1 ? ` Me interesa el viaje a ${lastTours[0].destination}.` : '';
    window.open(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(`Hola! Estoy consultando desde el chat de la web.${tourMsg}`)}`, '_blank');
  };

  const QUICK_FILTERS = [
    { label: "✈️ Ver viajes", prompt: "Mostrame todos los viajes disponibles" },
    { label: "⭐ Destacados", prompt: "Cuáles son los viajes destacados?" },
    { label: "💰 Más baratos", prompt: "Cuál es el viaje más barato?" },
    { label: "🔀 Comparar", prompt: "Quiero comparar dos viajes" },
    { label: "🌤 Clima", prompt: "Qué clima hace en el destino del próximo viaje?" },
    { label: "💳 Por presupuesto", prompt: "Tengo un presupuesto, recomendame un viaje" },
    { label: "📞 Contacto", prompt: "Datos de contacto" },
  ];

  return (
    <>
      {/* Botón flotante del chat con halo degradado y estado activo */}
      <div className="relative group/chat flex items-center">
        {/* Tooltip flotante en pantallas medianas/grandes */}
        <span
          className={cn(
            "absolute right-16 whitespace-nowrap text-xs font-semibold px-3 py-1.5 rounded-full shadow-lg",
            "bg-background/95 backdrop-blur-md border border-primary/20 text-foreground",
            "opacity-0 group-hover/chat:opacity-100 pointer-events-none",
            "transition-all duration-300 translate-x-2 group-hover/chat:translate-x-0",
            "hidden sm:flex items-center gap-1.5 z-20"
          )}
        >
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          <span>Asistente IA · ¿Te ayudo a viajar?</span>
        </span>

        {/* Aura ambiental luminosa */}
        <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-primary via-rose-500 to-amber-500 opacity-40 blur-md group-hover:opacity-85 transition duration-500 -z-10 group-hover:scale-110" />

        <Button
          onClick={() => setIsOpen(true)}
          size="icon"
          className={cn(
            "relative h-12 w-12 sm:h-14 sm:w-14 rounded-full shadow-xl",
            "bg-gradient-to-tr from-primary via-primary to-rose-500 hover:from-primary/95 hover:to-rose-600",
            "text-primary-foreground border-2 border-white/20",
            "transition-all duration-300 hover:scale-105 active:scale-95",
            "focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          )}
          aria-label="Abrir asistente virtual de viajes"
        >
          <div className="relative flex items-center justify-center">
            <MessageCircle className="h-6 w-6 transition-transform group-hover/chat:scale-110" />
            <Sparkles className="h-3 w-3 text-amber-300 absolute -top-1.5 -right-1.5 animate-pulse" />
          </div>

          {/* Indicador de estado en línea */}
          <span className="absolute top-0.5 right-0.5 flex h-3.5 w-3.5" title="En línea">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 ring-2 ring-background"></span>
          </span>
        </Button>
      </div>

      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent side="right" className="w-full sm:w-[440px] md:w-[460px] flex flex-col p-0 border-l border-border/70 shadow-2xl bg-background">
          {/* Header con gradiente distintivo de marca */}
          <SheetHeader className="p-4 bg-gradient-to-r from-primary via-primary/95 to-rose-600 text-white relative overflow-hidden shrink-0">
            <div className="absolute -right-10 -bottom-10 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
            <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Avatar className="h-11 w-11 bg-white/15 backdrop-blur-md ring-2 ring-white/30 border border-white/20">
                    <AvatarFallback className="bg-transparent text-white font-bold">
                      <Bot className="h-6 w-6 text-white" />
                    </AvatarFallback>
                  </Avatar>
                  <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-400 ring-2 ring-primary"></span>
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <SheetTitle className="text-white text-base font-bold tracking-tight">
                      Asistente de Viajes
                    </SheetTitle>
                    <span className="bg-white/20 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full backdrop-blur-xs flex items-center gap-1">
                      <Sparkles className="h-2.5 w-2.5 text-amber-300" /> IA
                    </span>
                  </div>
                  <SheetDescription className="text-white/80 text-xs font-normal">
                    {user && (user as any).name ? `Hola, ${(user as any).name?.split(' ')[0]} · ` : ''}Powered by Gemini 3.8
                  </SheetDescription>
                </div>
              </div>

              <div className="flex items-center gap-1">
                {whatsappNumber && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={openWhatsApp}
                    className="h-8 w-8 text-white hover:bg-white/20 rounded-full transition-colors"
                    title="Continuar por WhatsApp"
                  >
                    <WhatsAppIcon className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={resetChat}
                  className="h-8 w-8 text-white hover:bg-white/20 rounded-full transition-colors"
                  title="Reiniciar conversación"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </SheetHeader>

          {/* Historial de mensajes */}
          <ScrollArea className="flex-1 p-4 bg-muted/20" ref={scrollAreaRef}>
            <div className="space-y-4">
              {messages.map((message, index) => (
                <div key={index} className="space-y-3">
                  {/* Burbuja del mensaje */}
                  <div className={cn("flex gap-2.5", message.role === "user" ? "flex-row-reverse" : "flex-row")}>
                    <Avatar className={cn(
                      "h-8 w-8 shrink-0 rounded-full shadow-2xs mt-0.5",
                      message.role === "user" ? "bg-secondary text-secondary-foreground" : "bg-primary/10 border border-primary/20 text-primary"
                    )}>
                      <AvatarFallback className="bg-transparent text-xs font-medium">
                        {message.role === "user"
                          ? <User className="h-4 w-4" />
                          : <Bot className="h-4 w-4 text-primary" />}
                      </AvatarFallback>
                    </Avatar>

                    <div className={cn(
                      "rounded-2xl px-4 py-3 max-w-[85%] text-sm leading-relaxed",
                      message.role === "user"
                        ? "bg-primary text-primary-foreground rounded-tr-xs shadow-xs font-normal"
                        : "bg-card border border-border/80 text-foreground rounded-tl-xs shadow-xs"
                    )}>
                      <p className="whitespace-pre-wrap">{message.content}</p>
                    </div>
                  </div>

                  {/* Media adjunta */}
                  {message.media && (
                    <div className="ml-10 rounded-xl overflow-hidden border border-border shadow-sm max-w-[300px]">
                      {message.media.type === 'video'
                        ? <video src={message.media.url} controls className="w-full h-auto" />
                        : <img src={message.media.url} alt="Media" className="w-full h-auto object-cover" />}
                    </div>
                  )}

                  {/* Widget del Clima */}
                  {message.weather && (
                    <div className="ml-10 rounded-xl border border-sky-200 dark:border-sky-900 bg-gradient-to-br from-sky-500/10 via-card to-card p-3.5 space-y-2.5 shadow-xs max-w-[320px]">
                      <div className="flex items-center justify-between font-semibold text-sm">
                        <div className="flex items-center gap-2 text-sky-600 dark:text-sky-400">
                          <Cloud className="h-4 w-4" />
                          <span>Clima en {message.weather.city}</span>
                        </div>
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-700 dark:text-sky-300 font-medium">
                          Tiempo
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="flex items-center gap-1.5 bg-background/60 rounded-lg p-2 border border-border/40">
                          <Thermometer className="h-3.5 w-3.5 text-orange-500 shrink-0" />
                          <div>
                            <span className="font-bold text-foreground text-sm">{message.weather.temp}</span>
                            <span className="block text-[10px] text-muted-foreground">Sens. {message.weather.feelsLike}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 bg-background/60 rounded-lg p-2 border border-border/40">
                          <Droplets className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                          <div>
                            <span className="font-bold text-foreground text-sm">{message.weather.humidity}</span>
                            <span className="block text-[10px] text-muted-foreground">Humedad</span>
                          </div>
                        </div>
                        <div className="col-span-2 text-xs text-muted-foreground italic px-1">
                          {message.weather.desc}
                        </div>
                      </div>
                      {message.weather.forecast && (
                        <div className="text-[11px] text-muted-foreground border-t border-border/60 pt-2">
                          <span className="font-semibold text-foreground">Pronóstico: </span>{message.weather.forecast}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Comparación de viajes */}
                  {message.isComparison && message.tours && message.tours.length >= 2 && (
                    <div className="ml-10 max-w-[360px] space-y-2">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                        <ArrowLeftRight className="h-3.5 w-3.5" /> Comparativa de opciones
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {message.tours.slice(0, 2).map(tour => (
                          <div key={tour.id} className="rounded-xl border border-border/80 bg-card overflow-hidden shadow-xs hover:border-primary/50 transition-colors flex flex-col">
                            {tour.backgroundImage && (
                              <div className="h-20 bg-cover bg-center" style={{ backgroundImage: `url(${tour.backgroundImage})` }} />
                            )}
                            <div className="p-2.5 flex-1 flex flex-col justify-between space-y-2">
                              <div>
                                <p className="font-semibold text-xs leading-tight line-clamp-1">{tour.destination}</p>
                                <div className="text-[11px] text-muted-foreground space-y-0.5 mt-1">
                                  <div className="flex items-center gap-1">
                                    <Calendar className="h-2.5 w-2.5" />{formatTourDate(tour.date)}
                                  </div>
                                  {(tour.days || tour.nights) && (
                                    <div className="flex items-center gap-1">
                                      <MapPin className="h-2.5 w-2.5" />{tour.days}D/{tour.nights}N
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div>
                                <p className="text-xs font-bold text-primary mb-1.5">
                                  {formatPrice(tour.price, tour.currency)}
                                </p>
                                <div className="flex gap-1">
                                  <Button size="sm" variant="outline" className="flex-1 text-[11px] h-7 px-1 rounded-md" onClick={() => handleViewTour(tour.id)}>
                                    <Eye className="h-2.5 w-2.5 mr-0.5" />Ver
                                  </Button>
                                  <Button size="sm" className="flex-1 text-[11px] h-7 px-1 rounded-md" onClick={() => handleViewTour(tour.id)}>
                                    <Ticket className="h-2.5 w-2.5 mr-0.5" />Reservar
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Tarjetas de viajes recomendados */}
                  {!message.isComparison && message.tours && message.tours.length > 0 && (
                    <div className="ml-10 space-y-3">
                      {message.tours.map((tour) => (
                        <div
                          key={tour.id}
                          className="rounded-xl border border-border/80 bg-card overflow-hidden shadow-xs hover:shadow-md hover:border-primary/40 transition-all duration-200"
                        >
                          {tour.backgroundImage && (
                            <div
                              className="h-28 bg-cover bg-center relative"
                              style={{ backgroundImage: `url(${tour.backgroundImage})` }}
                            >
                              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />
                              <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                                {tour.isFeatured && (
                                  <span className="bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-xs">
                                    <Star className="h-2.5 w-2.5 fill-current" /> Destacado
                                  </span>
                                )}
                              </div>
                              {tour.availableSeats !== undefined && tour.availableSeats <= 5 && tour.availableSeats > 0 && (
                                <span className="absolute top-2.5 right-2.5 bg-rose-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs">
                                  Últimos {tour.availableSeats} lugares
                                </span>
                              )}
                              <div className="absolute bottom-2 left-2.5 right-2.5 flex items-baseline justify-between text-white">
                                <h4 className="font-bold text-sm drop-shadow-md truncate">{tour.destination}</h4>
                                <span className="text-sm font-extrabold text-amber-300 drop-shadow-md shrink-0 ml-2">
                                  {formatPrice(tour.price, tour.currency)}
                                </span>
                              </div>
                            </div>
                          )}

                          <div className="p-3 space-y-2.5">
                            {!tour.backgroundImage && (
                              <div className="flex items-baseline justify-between">
                                <h4 className="font-bold text-sm text-foreground">{tour.destination}</h4>
                                <span className="text-sm font-bold text-primary">
                                  {formatPrice(tour.price, tour.currency)}
                                </span>
                              </div>
                            )}

                            <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3 text-primary/70" />{formatTourDate(tour.date)}
                              </span>
                              {tour.days && tour.nights && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3 text-primary/70" />{tour.days}D/{tour.nights}N
                                </span>
                              )}
                              {tour.departureTime && (
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3 text-primary/70" />Salida {tour.departureTime}
                                </span>
                              )}
                              {tour.availableSeats !== undefined && tour.availableSeats > 5 && (
                                <span className="flex items-center gap-1">
                                  <User className="h-3 w-3 text-primary/70" />{tour.availableSeats} lugares
                                </span>
                              )}
                            </div>

                            {tour.description && (
                              <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                                {tour.description}
                              </p>
                            )}

                            {/* Mini galería */}
                            {tour.gallery && tour.gallery.filter(g => g.type === 'image').length > 0 && (
                              <div className="flex gap-1.5 overflow-x-auto py-1">
                                {tour.gallery.filter(g => g.type === 'image').slice(0, 3).map((img, idx) => (
                                  <a key={idx} href={img.url} target="_blank" rel="noopener noreferrer" className="shrink-0">
                                    <div
                                      className="h-12 w-16 rounded-md bg-cover bg-center border border-border/80 hover:opacity-85 transition-opacity cursor-pointer shadow-2xs"
                                      style={{ backgroundImage: `url(${img.url})` }}
                                      title="Ver foto"
                                    />
                                  </a>
                                ))}
                                {tour.gallery.filter(g => g.type === 'image').length > 3 && (
                                  <div className="h-12 w-14 rounded-md border border-border/80 shrink-0 bg-muted/60 flex items-center justify-center text-xs font-medium text-muted-foreground">
                                    +{tour.gallery.filter(g => g.type === 'image').length - 3}
                                  </div>
                                )}
                              </div>
                            )}

                            <div className="flex gap-2 pt-1 border-t border-border/50">
                              <Button
                                size="sm"
                                variant="outline"
                                className="flex-1 text-xs h-8 rounded-lg"
                                onClick={() => handleViewTour(tour.id)}
                              >
                                <Eye className="h-3 w-3 mr-1.5" /> Ver detalles
                              </Button>
                              <Button
                                size="sm"
                                className="flex-1 text-xs h-8 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-medium shadow-xs"
                                onClick={() => handleViewTour(tour.id)}
                              >
                                <Ticket className="h-3 w-3 mr-1.5" /> Reservar
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Links de acción */}
                  {message.links && message.links.length > 0 && (
                    <div className="ml-10 grid grid-cols-2 gap-2 max-w-[320px]">
                      {message.links.map((link, linkIndex) => (
                        <Button
                          key={linkIndex}
                          variant="outline"
                          size="sm"
                          className="text-xs gap-1.5 h-8.5 justify-start px-2.5 truncate rounded-lg hover:border-primary/50"
                          onClick={() => handleLinkClick(link.url)}
                        >
                          <span className="shrink-0">{getLinkIcon(link.icon)}</span>
                          <span className="truncate">{link.text}</span>
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {/* Indicador de carga estilizado */}
              {isLoading && (
                <div className="flex gap-2.5 items-center">
                  <Avatar className="h-8 w-8 shrink-0 bg-primary/10 border border-primary/20 text-primary">
                    <AvatarFallback className="bg-transparent">
                      <Bot className="h-4 w-4 text-primary animate-pulse" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="rounded-2xl rounded-tl-xs px-4 py-2.5 bg-card border border-border/80 shadow-xs flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Pensando respuesta</span>
                    <div className="flex gap-1 items-center">
                      <span className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}

              {/* Sugerencias rápidas al inicio */}
              {messages.length === 1 && (
                <div className="space-y-2.5 pt-2">
                  <p className="text-xs font-semibold text-muted-foreground text-center flex items-center justify-center gap-1.5">
                    <Sparkles className="h-3 w-3 text-primary" /> Consultas frecuentes:
                  </p>
                  <div className="flex flex-wrap gap-1.5 justify-center">
                    {QUICK_FILTERS.map(f => (
                      <button
                        key={f.prompt}
                        type="button"
                        onClick={() => sendMessage(f.prompt)}
                        className="text-xs px-3 py-1.5 rounded-full bg-background border border-border/80 hover:border-primary hover:bg-primary/5 text-foreground hover:text-primary transition-all duration-200 shadow-2xs font-medium"
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Formulario de entrada flotante */}
          <div className="p-3.5 border-t border-border/70 bg-background/95 backdrop-blur-md shrink-0">
            <form onSubmit={(e) => { e.preventDefault(); sendMessage(); }} className="relative flex items-center">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Preguntá por viajes, presupuestos, clima..."
                disabled={isLoading}
                className="pr-12 pl-4 py-2 h-11 rounded-full bg-muted/60 border-border/80 focus-visible:ring-2 focus-visible:ring-primary/25 text-sm"
              />
              <Button
                type="submit"
                disabled={!input.trim() || isLoading}
                size="icon"
                className="absolute right-1.5 h-8 w-8 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm transition-transform hover:scale-105 active:scale-95 disabled:opacity-40"
                aria-label="Enviar mensaje"
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
            <div className="flex items-center justify-between pt-2 px-2 text-[11px] text-muted-foreground/75">
              <span className="flex items-center gap-1 font-medium">
                <Sparkles className="h-3 w-3 text-primary" /> Asistente IA activo
              </span>
              <span>Presioná Enter para enviar</span>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
