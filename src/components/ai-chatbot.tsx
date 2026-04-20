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
  DollarSign, Star, Filter, X
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
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
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
      <Button
        onClick={() => setIsOpen(true)}
        size="icon"
        className="h-12 w-12 rounded-full shadow-lg bg-primary hover:bg-primary/90"
        aria-label="Abrir asistente virtual"
      >
        <MessageCircle className="h-6 w-6" />
      </Button>

      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent side="right" className="w-full sm:w-[420px] flex flex-col p-0">
          <SheetHeader className="p-4 border-b bg-primary text-primary-foreground">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10 bg-primary-foreground/20">
                  <AvatarFallback className="bg-transparent">
                    <Bot className="h-5 w-5 text-primary-foreground" />
                  </AvatarFallback>
                </Avatar>
                <div>
                  <SheetTitle className="text-primary-foreground">
                    Asistente IA{user && (user as any).name ? ` · Hola, ${(user as any).name?.split(' ')[0]}!` : ''}
                  </SheetTitle>
                  <SheetDescription className="text-primary-foreground/70 text-xs">
                    Powered by Gemini · Comparás · Clima · Presupuesto
                  </SheetDescription>
                </div>
              </div>
              <div className="flex gap-1">
                {whatsappNumber && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={openWhatsApp}
                    className="text-primary-foreground hover:bg-primary-foreground/20"
                    title="Continuar por WhatsApp"
                  >
                    <WhatsAppIcon className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={resetChat}
                  className="text-primary-foreground hover:bg-primary-foreground/20"
                  title="Reiniciar conversación"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </SheetHeader>

          <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
            <div className="space-y-4">
              {messages.map((message, index) => (
                <div key={index} className="space-y-3">
                  {/* Burbuja del mensaje */}
                  <div className={cn("flex gap-3", message.role === "user" ? "flex-row-reverse" : "flex-row")}>
                    <Avatar className={cn("h-8 w-8 shrink-0", message.role === "user" ? "bg-secondary" : "bg-primary")}>
                      <AvatarFallback className="bg-transparent">
                        {message.role === "user"
                          ? <User className="h-4 w-4 text-secondary-foreground" />
                          : <Bot className="h-4 w-4 text-primary-foreground" />}
                      </AvatarFallback>
                    </Avatar>
                    <div className={cn(
                      "rounded-lg px-3 py-2 max-w-[85%] text-sm",
                      message.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
                    )}>
                      <p className="whitespace-pre-wrap">{message.content}</p>
                    </div>
                  </div>

                  {/* Media */}
                  {message.media && (
                    <div className="ml-11 rounded-lg overflow-hidden border shadow-sm max-w-[280px]">
                      {message.media.type === 'video'
                        ? <video src={message.media.url} controls className="w-full h-auto" />
                        : <img src={message.media.url} alt="Media" className="w-full h-auto object-cover" />}
                    </div>
                  )}

                  {/* Clima */}
                  {message.weather && (
                    <div className="ml-11 rounded-lg border bg-card p-3 space-y-2 shadow-sm max-w-[300px]">
                      <div className="flex items-center gap-2 font-semibold text-sm">
                        <Cloud className="h-4 w-4 text-blue-500" />
                        Clima en {message.weather.city}
                      </div>
                      <div className="grid grid-cols-2 gap-1.5 text-xs">
                        <div className="flex items-center gap-1">
                          <Thermometer className="h-3 w-3 text-orange-500" />
                          <span>{message.weather.temp} (sens. {message.weather.feelsLike})</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Droplets className="h-3 w-3 text-blue-400" />
                          <span>Humedad {message.weather.humidity}</span>
                        </div>
                        <div className="col-span-2 text-muted-foreground italic">{message.weather.desc}</div>
                      </div>
                      {message.weather.forecast && (
                        <div className="text-xs text-muted-foreground border-t pt-1.5">
                          <span className="font-medium">Pronóstico: </span>{message.weather.forecast}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Comparación de viajes (2 columnas) */}
                  {message.isComparison && message.tours && message.tours.length >= 2 && (
                    <div className="ml-11 max-w-[350px]">
                      <div className="flex items-center gap-1 text-xs font-semibold text-muted-foreground mb-2">
                        <ArrowLeftRight className="h-3 w-3" /> Comparación
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {message.tours.slice(0, 2).map(tour => (
                          <div key={tour.id} className="rounded-lg border bg-card overflow-hidden shadow-sm">
                            {tour.backgroundImage && (
                              <div className="h-20 bg-cover bg-center" style={{ backgroundImage: `url(${tour.backgroundImage})` }} />
                            )}
                            <div className="p-2 space-y-1">
                              <p className="font-semibold text-xs leading-tight line-clamp-2">{tour.destination}</p>
                              <div className="text-xs text-muted-foreground space-y-0.5">
                                <div className="flex items-center gap-1"><Calendar className="h-2.5 w-2.5" />{formatTourDate(tour.date)}</div>
                                {(tour.days || tour.nights) && <div className="flex items-center gap-1"><MapPin className="h-2.5 w-2.5" />{tour.days}D/{tour.nights}N</div>}
                                {tour.availableSeats && <div className="flex items-center gap-1"><User className="h-2.5 w-2.5" />{tour.availableSeats} lugares</div>}
                              </div>
                              <p className="text-xs font-bold text-primary">{formatPrice(tour.price, tour.currency)}</p>
                              {tour.isFeatured && <span className="inline-block text-xs bg-primary/10 text-primary px-1 rounded">⭐ Dest.</span>}
                              <div className="flex gap-1 pt-1">
                                <Button size="sm" variant="outline" className="flex-1 text-xs h-7 px-1" onClick={() => handleViewTour(tour.id)}>
                                  <Eye className="h-2.5 w-2.5 mr-0.5" />Ver
                                </Button>
                                <Button size="sm" className="flex-1 text-xs h-7 px-1" onClick={() => handleViewTour(tour.id)}>
                                  <Ticket className="h-2.5 w-2.5 mr-0.5" />Res.
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Tarjetas de viajes normales */}
                  {!message.isComparison && message.tours && message.tours.length > 0 && (
                    <div className="ml-11 space-y-3">
                      {message.tours.map((tour) => (
                        <div key={tour.id} className="rounded-lg border bg-card overflow-hidden shadow-sm">
                          {tour.backgroundImage && (
                            <div
                              className="h-24 bg-cover bg-center relative"
                              style={{ backgroundImage: `url(${tour.backgroundImage})` }}
                            >
                              {tour.isFeatured && (
                                <span className="absolute top-2 left-2 bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                                  <Star className="h-2.5 w-2.5" /> Destacado
                                </span>
                              )}
                              {tour.availableSeats !== undefined && tour.availableSeats <= 5 && tour.availableSeats > 0 && (
                                <span className="absolute top-2 right-2 bg-destructive text-destructive-foreground text-xs px-2 py-0.5 rounded-full">
                                  ⚠ {tour.availableSeats} lugares
                                </span>
                              )}
                            </div>
                          )}
                          <div className="p-3 space-y-2">
                            <h4 className="font-semibold text-sm">{tour.destination}</h4>
                            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />{formatTourDate(tour.date)}
                              </span>
                              {tour.days && tour.nights && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />{tour.days}D/{tour.nights}N
                                </span>
                              )}
                              {tour.availableSeats !== undefined && tour.availableSeats > 5 && (
                                <span className="flex items-center gap-1">
                                  <User className="h-3 w-3" />{tour.availableSeats} lugares
                                </span>
                              )}
                              {tour.departureTime && (
                                <span className="flex items-center gap-1">🕐 {tour.departureTime}</span>
                              )}
                            </div>

                            {/* Descripción breve */}
                            {tour.description && (
                              <p className="text-xs text-muted-foreground line-clamp-2">{tour.description}</p>
                            )}

                            {/* Tags */}
                            {tour.tags && tour.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {tour.tags.slice(0, 3).map(tag => (
                                  <span key={tag} className="text-xs bg-secondary px-1.5 py-0.5 rounded-full">{tag}</span>
                                ))}
                              </div>
                            )}

                            <p className="text-sm font-bold text-primary">{formatPrice(tour.price, tour.currency)}</p>

                            {/* Galería de fotos (primeras 3) */}
                            {tour.gallery && tour.gallery.filter(g => g.type === 'image').length > 0 && (
                              <div className="flex gap-1 overflow-x-auto py-0.5">
                                {tour.gallery.filter(g => g.type === 'image').slice(0, 3).map((img, idx) => (
                                  <a key={idx} href={img.url} target="_blank" rel="noopener noreferrer">
                                    <div
                                      className="h-12 w-16 rounded bg-cover bg-center border shrink-0 hover:opacity-80 transition-opacity cursor-pointer"
                                      style={{ backgroundImage: `url(${img.url})` }}
                                      title="Ver foto"
                                    />
                                  </a>
                                ))}
                                {tour.gallery.filter(g => g.type === 'image').length > 3 && (
                                  <div className="h-12 w-16 rounded border shrink-0 bg-muted flex items-center justify-center text-xs text-muted-foreground">
                                    +{tour.gallery.filter(g => g.type === 'image').length - 3}
                                  </div>
                                )}
                              </div>
                            )}

                            <div className="flex gap-2 pt-1">
                              <Button size="sm" variant="outline" className="flex-1 text-xs h-8" onClick={() => handleViewTour(tour.id)}>
                                <Eye className="h-3 w-3 mr-1" />Ver más
                              </Button>
                              <Button size="sm" className="flex-1 text-xs h-8" onClick={() => handleViewTour(tour.id)}>
                                <Ticket className="h-3 w-3 mr-1" />Reservar
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Links */}
                  {message.links && message.links.length > 0 && (
                    <div className="ml-11 grid grid-cols-2 gap-2 max-w-[280px]">
                      {message.links.map((link, linkIndex) => (
                        <Button
                          key={linkIndex}
                          variant="outline"
                          size="sm"
                          className="text-xs gap-1.5 h-9 justify-start px-2 truncate"
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

              {isLoading && (
                <div className="flex gap-3">
                  <Avatar className="h-8 w-8 shrink-0 bg-primary">
                    <AvatarFallback className="bg-transparent">
                      <Bot className="h-4 w-4 text-primary-foreground" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="rounded-lg px-3 py-2 bg-muted">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}

              {/* Filtros rápidos — solo al inicio */}
              {messages.length === 1 && (
                <div className="space-y-3 pt-2">
                  <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1">
                    <Filter className="h-3 w-3" /> Acciones rápidas:
                  </p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {QUICK_FILTERS.map(f => (
                      <Button
                        key={f.prompt}
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={() => sendMessage(f.prompt)}
                      >
                        {f.label}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          <div className="p-4 border-t bg-background">
            <form onSubmit={(e) => { e.preventDefault(); sendMessage(); }} className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Escribe tu mensaje..."
                disabled={isLoading}
                className="flex-1"
              />
              <Button type="submit" disabled={!input.trim() || isLoading} size="icon">
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
