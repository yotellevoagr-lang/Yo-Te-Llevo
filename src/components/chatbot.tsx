
"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Bot, User, CornerDownLeft, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { getChatbotFlow, type ChatbotNode } from "@/lib/chatbot-nodes";
import { executeChatbotAction, type ActionType, type ActionResponse } from "@/lib/chatbot-flow";
import { useAuth } from "./auth/auth-provider";
import { TourCard } from "./tour-card";
import { useRouter } from "next/navigation";

interface Message {
  role: "bot" | "user";
  content: React.ReactNode;
  nodeId?: string;
}

export default function Chatbot() {
  const { user, loading: authLoading } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [currentNode, setCurrentNode] = useState<ChatbotNode>(getChatbotFlow("start"));
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  
  const startChat = useCallback(async () => {
    setIsLoading(true);
    const initialNode = getChatbotFlow("start");
    setCurrentNode(initialNode);
    setMessages([{ role: "bot", content: initialNode.message, nodeId: 'start' }]);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      startChat();
    }
  }, [isOpen, messages.length, startChat]);
  
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

  const handleUserInput = async (value: string, action?: ActionType) => {
    if (!value.trim() || !currentNode) return;

    const userMessage: Message = { role: "user", content: value };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    if (currentNode.action) {
      const response: ActionResponse = await executeChatbotAction(currentNode.action, value);
      const nextNodeId = response.success ? currentNode.options[0].next : (currentNode.options[1]?.next || 'start');
      const nextNode = getChatbotFlow(nextNodeId);
      
      const botMessageContent = (
        <div className="space-y-2">
            <div>{response.message}</div>
            {response.data && response.data.map((item: any) => (
                <div key={item.id} className="p-2 border rounded-md bg-background/50">
                    {item.destination ? ( // It's a trip
                       <p><b>{item.destination}</b> - {new Date(item.date).toLocaleDateString()}</p>
                    ) : ( // It's passenger data
                        <ul className="text-sm">
                            <li><b>Nombre:</b> {item.fullName}</li>
                            <li><b>DNI:</b> {item.dni}</li>
                            <li><b>Viajes realizados:</b> {item.tripCount}</li>
                        </ul>
                    )}
                </div>
            ))}
        </div>
      );

      setMessages(prev => [...prev, { role: "bot", content: botMessageContent, nodeId: nextNodeId }]);
      setCurrentNode(nextNode);
    }
    setIsLoading(false);
  };
  
  const handleOptionClick = async (optionText: string, nextNodeId: string, action?: ActionType, isExternalLink?: boolean) => {
    
    if (isExternalLink) {
        router.push(nextNodeId);
        setIsOpen(false);
        return;
    }

    const userMessage: Message = { role: "user", content: optionText };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    let finalNextNodeId = nextNodeId;
    let botMessageContent: React.ReactNode = "";

    if (action) {
      const response = await executeChatbotAction(action, user?.id);
      finalNextNodeId = response.success ? nextNodeId : (response.fallbackNode || 'start');
      
      if(response.data && Array.isArray(response.data)) {
        if(action === 'fetchFeaturedTours' || action === 'fetchAllTours') {
           botMessageContent = (
            <div className="space-y-4">
                <p>{response.message}</p>
                <div className="flex flex-col gap-4">
                  {response.data.map(tour => (
                    <div key={tour.id} className="w-full max-w-xs mx-auto">
                       <TourCard tour={{...tour, date: new Date(tour.date)}} />
                    </div>
                  ))}
                </div>
            </div>
          );
        } else {
           botMessageContent = (
              <div className="space-y-2">
                  <div>{response.message}</div>
                  {response.data.map((item: any) => (
                      <div key={item.id} className="p-2 border rounded-md bg-background/50">
                          {item.destination ? ( // It's a trip
                            <p><b>{item.destination}</b> - {new Date(item.date).toLocaleDateString()}</p>
                          ) : ( // It's passenger data
                              <ul className="text-sm">
                                  <li><b>Nombre:</b> {item.fullName}</li>
                                  <li><b>DNI:</b> {item.dni}</li>
                                  <li><b>Viajes realizados:</b> {item.tripCount}</li>
                              </ul>
                          )}
                      </div>
                  ))}
              </div>
            );
        }
      } else {
        botMessageContent = response.message;
      }
    }

    const nextNode = getChatbotFlow(finalNextNodeId);
    if (!botMessageContent) {
      botMessageContent = nextNode.message;
    }

    setMessages(prev => [...prev, { role: "bot", content: botMessageContent, nodeId: finalNextNodeId }]);
    setCurrentNode(nextNode);
    setIsLoading(false);
  }

  const handleBack = (nodeId?: string) => {
    if (!nodeId) {
      startChat();
      return;
    }
    
    const currentNodeMessageIndex = messages.findIndex(m => m.nodeId === nodeId);

    if (currentNodeMessageIndex > 0) {
        const previousBotMessageIndex = messages.slice(0, currentNodeMessageIndex -1).reverse().findIndex(m => m.role === 'bot');
        if (previousBotMessageIndex !== -1) {
            const indexToKeep = (currentNodeMessageIndex - 1) - previousBotMessageIndex;
            const previousBotMessage = messages[indexToKeep];
            const previousNode = getChatbotFlow(previousBotMessage.nodeId || 'start');
            setMessages(prev => prev.slice(0, indexToKeep + 1));
            setCurrentNode(previousNode);
            return;
        }
    }
    
    startChat();
  }


  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 h-16 w-16 rounded-full bg-primary text-primary-foreground shadow-2xl transition-transform duration-300 hover:scale-110 active:scale-100 group"
      >
        <svg
          className="h-8 w-8 transition-transform duration-500 group-hover:rotate-12"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
            <path d="M16 8.00012L18.5 5.50012" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M12.5 5.5L12 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M9.5 5.5L10 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M8 8.00012L5.5 5.50012" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M12 20.5C16.1421 20.5 19.5 17.1421 19.5 13C19.5 8.85786 16.1421 5.5 12 5.5C7.85786 5.5 4.5 8.85786 4.5 13C4.5 14.4819 4.90151 15.854 5.60192 17L4.5 20.5L8 19.3981C9.14599 19.9985 10.5181 20.4 12 20.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>

      </Button>

      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent className="flex flex-col p-0 w-full sm:w-[440px] sm:max-w-md">
          <SheetHeader className="p-4 border-b bg-muted">
            <div className="flex items-center gap-3">
                <div className="flex items-center justify-center h-12 w-12 rounded-full bg-gradient-to-br from-primary to-pink-500 text-white">
                    <Bot className="h-7 w-7"/>
                </div>
                <div>
                    <SheetTitle className="text-xl font-bold">Asistente Virtual</SheetTitle>
                    <SheetDescription>Resuelve tus dudas al instante.</SheetDescription>
                </div>
            </div>
          </SheetHeader>
          <ScrollArea className="flex-1" ref={scrollAreaRef}>
            <div className="p-4 space-y-6">
              {messages.map((msg, index) => (
                <div key={index} className={cn("flex items-start gap-3 animate-fade-in-up", msg.role === "user" ? "justify-end" : "justify-start")}>
                  {msg.role === "bot" && <Avatar className="h-8 w-8 border-2 border-primary/50"><AvatarFallback className="bg-primary text-primary-foreground"><Bot className="h-5 w-5"/></AvatarFallback></Avatar>}
                  <div className={cn("max-w-xs md:max-w-sm rounded-2xl px-4 py-3 text-sm shadow-md", msg.role === "user" ? "bg-primary text-primary-foreground rounded-br-none" : "bg-muted rounded-bl-none")}>
                     {typeof msg.content === 'string' ? <p className="whitespace-pre-wrap">{msg.content}</p> : msg.content}
                  </div>
                  {msg.role === "user" && <Avatar className="h-8 w-8"><AvatarFallback><User className="h-5 w-5"/></AvatarFallback></Avatar>}
                </div>
              ))}
              {isLoading && (
                <div className="flex items-start gap-3 justify-start animate-fade-in-up">
                  <Avatar className="h-8 w-8 border-2 border-primary/50"><AvatarFallback className="bg-primary text-primary-foreground"><Bot className="h-5 w-5"/></AvatarFallback></Avatar>
                  <div className="bg-muted rounded-2xl rounded-bl-none px-4 py-3 flex items-center gap-2">
                    <span className="w-2 h-2 bg-muted-foreground rounded-full animate-pulse [animation-delay:-0.3s]"></span>
                    <span className="w-2 h-2 bg-muted-foreground rounded-full animate-pulse [animation-delay:-0.15s]"></span>
                    <span className="w-2 h-2 bg-muted-foreground rounded-full animate-pulse"></span>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
          {currentNode && (
            <SheetFooter className="p-4 border-t bg-background">
              <div className="w-full space-y-2">
                  {currentNode.options.length > 0 && !currentNode.isUserInput && (
                      <div className="flex flex-wrap gap-2 justify-center">
                          {currentNode.options.map((opt, i) => (
                            <Button key={i} variant="outline" onClick={() => handleOptionClick(opt.text, opt.next, opt.action, opt.isExternalLink)} disabled={isLoading || (opt.requiresAuth && authLoading) || (opt.requiresAuth && !user)} className="rounded-full shadow-sm">
                                {opt.text}
                            </Button>
                          ))}
                      </div>
                  )}
                  {currentNode.isUserInput && (
                      <form onSubmit={(e) => { e.preventDefault(); handleUserInput(input); }} className="flex w-full space-x-2">
                          <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder={currentNode.message} disabled={isLoading} className="rounded-full h-11"/>
                          <Button type="submit" size="icon" disabled={isLoading || !input.trim()} className="rounded-full h-11 w-11"><CornerDownLeft className="h-4 w-4" /></Button>
                      </form>
                  )}
                  {currentNode.id !== 'start' && <Button variant="ghost" size="sm" className="w-full text-muted-foreground hover:text-primary mt-2" onClick={() => handleBack(currentNode.id)}><ArrowLeft className="mr-2 h-4 w-4"/> Volver</Button>}
              </div>
            </SheetFooter>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
