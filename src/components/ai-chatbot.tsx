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
import { Bot, User, Send, RotateCcw, MessageCircle, Calendar, MapPin, Eye, Ticket } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { es } from "date-fns/locale";

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

interface Message {
  role: "user" | "assistant";
  content: string;
  tours?: TourData[];
}

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
        content: "¡Hola! 👋 Soy el asistente virtual de YO TE LLEVO. ¿En qué puedo ayudarte hoy?\n\nPuedo mostrarte los viajes disponibles, explicarte cómo reservar, informarte sobre métodos de pago y más."
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
          tours: data.tours || undefined
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
      content: "¡Hola! 👋 Soy el asistente virtual de YO TE LLEVO. ¿En qué puedo ayudarte hoy?\n\nPuedo mostrarte los viajes disponibles, explicarte cómo reservar, informarte sobre métodos de pago y más."
    }]);
  };

  const handleViewTour = (tourId: string) => {
    router.push(`/booking/${tourId}`);
    setIsOpen(false);
  };

  const handleQuickAction = (action: string) => {
    setInput(action);
    setTimeout(() => {
      const form = document.querySelector('[data-chat-form]');
      if (form) {
        const event = new Event('submit', { bubbles: true });
        form.dispatchEvent(event);
      }
    }, 100);
  };

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
                    YO TE LLEVO
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
                  <p className="text-xs text-muted-foreground text-center">Acciones rápidas:</p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() => handleQuickAction("Mostrame los viajes disponibles")}
                    >
                      ✈️ Ver viajes
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() => handleQuickAction("¿Cómo puedo reservar?")}
                    >
                      📝 Cómo reservar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() => handleQuickAction("¿Cuáles son los métodos de pago?")}
                    >
                      💳 Métodos de pago
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          <div className="p-4 border-t bg-background">
            <form 
              data-chat-form
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
