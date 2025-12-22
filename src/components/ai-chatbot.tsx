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
import { Bot, User, Send, RotateCcw, MessageCircle, Calendar, MapPin, Eye, Ticket, Phone, Mail, Instagram, Facebook, Map, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { es } from "date-fns/locale";

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
  isFeatured?: boolean;
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

export default function AIChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const scrollToBottom = () => {
    if (scrollAreaRef.current) {
      const viewport = scrollAreaRef.current.querySelector('div[data-radix-scroll-area-viewport]');
      if (viewport) {
        setTimeout(() => {
          viewport.scrollTop = viewport.scrollHeight;
        }, 100);
      }
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([{
        role: "assistant",
        content: "¡Hola! 👋 Soy el asistente virtual de YO TE LLEVO.\n\n¿Qué te gustaría saber? Puedo ayudarte a encontrar el viaje perfecto, mostrarte los más baratos, los destacados, darte info de contacto y más."
      }]);
    }
  }, [isOpen, messages.length]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    
    const newMessages: Message[] = [...messages, { role: "user", content: userMessage }];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          messages: newMessages.map(m => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            content: m.content
          }))
        }),
      });

      const data = await response.json();

      if (data.success && data.message) {
        setMessages(prev => [...prev, { 
          role: "assistant", 
          content: data.message,
          tours: data.tours || undefined,
          links: data.links || undefined
        }]);
      } else {
        setMessages(prev => [...prev, { 
          role: "assistant", 
          content: data.error || "Lo siento, hubo un problema. Por favor, intenta de nuevo." 
        }]);
      }
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, { 
        role: "assistant", 
        content: "Lo siento, no pude procesar tu mensaje. Verifica tu conexión e intenta de nuevo." 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const resetChat = () => {
    setMessages([{
      role: "assistant",
      content: "¡Hola! 👋 Soy el asistente virtual de YO TE LLEVO.\n\n¿Qué te gustaría saber? Puedo ayudarte a encontrar el viaje perfecto, mostrarte los más baratos, los destacados, darte info de contacto y más."
    }]);
  };

  const handleViewTour = (tourId: string) => {
    router.push(`/booking/${tourId}`);
    setIsOpen(false);
  };

  const handleLinkClick = (url: string) => {
    if (url.startsWith('/')) {
      router.push(url);
      setIsOpen(false);
    } else {
      window.open(url, '_blank');
    }
  };

  const handleQuickAction = (text: string) => {
    setInput(text);
    setTimeout(() => sendMessage(), 50);
  };

  useEffect(() => {
    if (input && isLoading === false) {
      const timer = setTimeout(() => {
        if (input) sendMessage();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, []);

  const formatTourDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return format(date, "d 'de' MMMM", { locale: es });
    } catch {
      return dateStr;
    }
  };

  const formatPrice = (price: number, currency: string) => {
    if (currency === 'USD') {
      return `USD $${price.toLocaleString()}`;
    }
    return `$${price.toLocaleString()}`;
  };

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        size="icon"
        className="fixed bottom-20 right-4 z-50 h-14 w-14 rounded-full shadow-lg bg-primary hover:bg-primary/90 md:bottom-6"
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
                  <SheetTitle className="text-primary-foreground">Asistente IA</SheetTitle>
                  <SheetDescription className="text-primary-foreground/70 text-xs">
                    Powered by Gemini
                  </SheetDescription>
                </div>
              </div>
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
          </SheetHeader>

          <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
            <div className="space-y-4">
              {messages.map((message, index) => (
                <div key={index} className="space-y-3">
                  <div
                    className={cn(
                      "flex gap-3",
                      message.role === "user" ? "flex-row-reverse" : "flex-row"
                    )}
                  >
                    <Avatar className={cn(
                      "h-8 w-8 shrink-0",
                      message.role === "user" ? "bg-secondary" : "bg-primary"
                    )}>
                      <AvatarFallback className="bg-transparent">
                        {message.role === "user" ? (
                          <User className="h-4 w-4 text-secondary-foreground" />
                        ) : (
                          <Bot className="h-4 w-4 text-primary-foreground" />
                        )}
                      </AvatarFallback>
                    </Avatar>
                    <div
                      className={cn(
                        "rounded-lg px-3 py-2 max-w-[85%] text-sm",
                        message.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      )}
                    >
                      <p className="whitespace-pre-wrap">{message.content}</p>
                    </div>
                  </div>

                  {message.tours && message.tours.length > 0 && (
                    <div className="ml-11 space-y-3">
                      {message.tours.map((tour) => (
                        <div
                          key={tour.id}
                          className="rounded-lg border bg-card overflow-hidden shadow-sm"
                        >
                          {tour.backgroundImage && (
                            <div 
                              className="h-24 bg-cover bg-center relative"
                              style={{ backgroundImage: `url(${tour.backgroundImage})` }}
                            >
                              {tour.isFeatured && (
                                <span className="absolute top-2 left-2 bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full">
                                  ⭐ Destacado
                                </span>
                              )}
                            </div>
                          )}
                          <div className="p-3 space-y-2">
                            <h4 className="font-semibold text-sm">{tour.destination}</h4>
                            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {formatTourDate(tour.date)}
                              </span>
                              {tour.days && tour.nights && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  {tour.days}D/{tour.nights}N
                                </span>
                              )}
                            </div>
                            <p className="text-sm font-bold text-primary">
                              {formatPrice(tour.price, tour.currency)}
                            </p>
                            <div className="flex gap-2 pt-1">
                              <Button
                                size="sm"
                                variant="outline"
                                className="flex-1 text-xs h-8"
                                onClick={() => handleViewTour(tour.id)}
                              >
                                <Eye className="h-3 w-3 mr-1" />
                                Ver más
                              </Button>
                              <Button
                                size="sm"
                                className="flex-1 text-xs h-8"
                                onClick={() => handleViewTour(tour.id)}
                              >
                                <Ticket className="h-3 w-3 mr-1" />
                                Reservar
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

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

              {messages.length === 1 && (
                <div className="space-y-2 pt-2">
                  <p className="text-xs text-muted-foreground text-center">Preguntame lo que quieras:</p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() => { setInput("Mostrame los viajes disponibles"); setTimeout(sendMessage, 100); }}
                    >
                      ✈️ Ver viajes
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() => { setInput("¿Cuál es el viaje más barato?"); setTimeout(sendMessage, 100); }}
                    >
                      💰 Más barato
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() => { setInput("Datos de contacto"); setTimeout(sendMessage, 100); }}
                    >
                      📞 Contacto
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() => { setInput("¿Cómo puedo reservar?"); setTimeout(sendMessage, 100); }}
                    >
                      📝 Cómo reservar
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          <div className="p-4 border-t bg-background">
            <form 
              onSubmit={(e) => { e.preventDefault(); sendMessage(); }}
              className="flex gap-2"
            >
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Escribe tu mensaje..."
                disabled={isLoading}
                className="flex-1"
              />
              <Button
                type="submit"
                disabled={!input.trim() || isLoading}
                size="icon"
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
