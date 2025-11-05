
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
import { Bot, User, CornerDownLeft, ArrowLeft, Mail, Phone, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { getChatbotFlow, type ChatbotNode } from "@/lib/chatbot-nodes";
import { executeChatbotAction, type ActionType, type ActionResponse } from "@/lib/chatbot-flow";
import type { ChatbotState } from "@/lib/types";
import { useAuth } from "./auth/auth-provider";
import { TourCard } from "./tour-card";
import { useRouter } from "next/navigation";
import { Separator } from "./ui/separator";

interface Message {
  role: "bot" | "user";
  content: React.ReactNode;
  nodeId?: string;
  context?: any;
}

export default function Chatbot() {
  const { user, loading: authLoading } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [currentNode, setCurrentNode] = useState<ChatbotNode>(getChatbotFlow("start"));
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentContext, setCurrentContext] = useState<any>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  
  const startChat = useCallback(async () => {
    setIsLoading(true);
    const initialNode = getChatbotFlow("start");
    setCurrentNode(initialNode);
    setMessages([{ role: "bot", content: initialNode.message, nodeId: 'start' }]);
    setCurrentContext(null);
    setSelectedTags([]);
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

  const handleUserInput = async (value: string) => {
    if (!value.trim() || !currentNode) return;

    const userMessage: Message = { role: "user", content: value };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    if (currentNode.action) {
      let contextForAction: any = value;
      // For pre-booking, we need to pass the tripId and paxCount along with the new user input (childCount)
      if (currentNode.action === 'calculatePrebookingPrice') {
          contextForAction = { ...currentContext, userInput: value };
      } else if (currentNode.action === 'askForChildren') {
          contextForAction = { ...currentContext, userInput: value };
      }
        
      const response: ActionResponse = await executeChatbotAction(currentNode.action, contextForAction);
      const nextNodeId = response.nodeId || (response.success ? (currentNode.options[0]?.next || 'start') : (currentNode.options[1]?.next || 'start'));
      let nextNode = getChatbotFlow(nextNodeId);
      
      if(response.context) {
          setCurrentContext(response.context);
      }

      let botMessageContent: React.ReactNode = response.message;
      
      if (response.options) {
        nextNode = { ...nextNode, options: response.options };
      }
        
       if (response.data) {
           if (response.data.contactInfo) {
                botMessageContent = (
                    <div className="space-y-3">
                        <p>{response.message}</p>
                        <div className="space-y-2 text-sm p-3 border rounded-md bg-background/50">
                            {response.data.contactInfo.phone && (
                                <a href={`tel:${response.data.contactInfo.phone}`} className="flex items-center gap-2 hover:text-primary">
                                    <Phone className="w-4 h-4"/> 
                                    <span>{response.data.contactInfo.phone}</span>
                                </a>
                            )}
                             {response.data.contactInfo.email && (
                                <a href={`mailto:${response.data.contactInfo.email}`} className="flex items-center gap-2 hover:text-primary">
                                    <Mail className="w-4 h-4"/> 
                                    <span>{response.data.contactInfo.email}</span>
                                </a>
                            )}
                        </div>
                        <p className="text-xs text-muted-foreground">También puedes visitar nuestra página de contacto para más detalles.</p>
                    </div>
                );
            } else if (response.data.details) {
                botMessageContent = (
                    <div className="space-y-2">
                        <p>{response.message}</p>
                        <div className="p-2 border rounded-md bg-background/50">
                            <p className="whitespace-pre-wrap">{response.data.details}</p>
                        </div>
                    </div>
                );
            }
        }

      // Dynamically update the 'Reservar' button link
      if (response.nodeId === 'trip_details_result' && response.data?.id) {
          nextNode.options = nextNode.options.map(opt => 
              opt.isExternalLink ? { ...opt, next: `/booking/${response.data.id}` } : opt
          );
          setCurrentContext({ tripId: response.data.id });
      }

      setMessages(prev => [...prev, { role: "bot", content: botMessageContent, nodeId: nextNodeId, context: value }]);
      setCurrentNode(nextNode);
    }
    setIsLoading(false);
  };
  
  const handleTagToggle = (tag: string) => {
    setSelectedTags(prev => 
        prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const handleOptionClick = async (optionText: string, nextNodeId: string, action?: ActionType, actionContext?: any, isExternalLink?: boolean, requiresAuth?: boolean) => {
    if (isExternalLink) {
        router.push(nextNodeId);
        setIsOpen(false);
        return;
    }
    
    // For tag selection, just update state, don't send messages
    if (action === 'searchTripsByAttribute') {
        const finalContext = actionContext || selectedTags;
        if(Array.isArray(finalContext) && finalContext.length === 0){
            toast({ title: "Selecciona al menos una etiqueta para buscar."});
            return;
        }
        
        const userMessage: Message = { role: "user", content: `Buscar viajes por: ${finalContext.join(', ')}` };
        setMessages(prev => [...prev, userMessage]);
        setIsLoading(true);

        const response = await executeChatbotAction(action, finalContext);
        const finalNodeId = response.fallbackNode || response.nodeId || nextNodeId;
        const nextNode = {...getChatbotFlow(finalNodeId)};
        let botMessageContent: React.ReactNode = response.message;
        
        if(response.data) {
             botMessageContent = (
              <div className="space-y-4">
                <p>{response.message}</p>
                {response.data.map((item: any) => (
                   <TourCard key={item.id} tour={{ ...item, date: new Date(item.date) }} />
                ))}
              </div>
            );
        }
        
        setMessages(prev => [...prev, { role: "bot", content: botMessageContent, nodeId: finalNodeId, context: finalContext }]);
        setCurrentNode(nextNode);
        setIsLoading(false);
        setSelectedTags([]); // Reset tags after search
        return;
    }

    const userMessage: Message = { role: "user", content: optionText };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    let finalNextNodeId = nextNodeId;
    let botMessageContent: React.ReactNode = "";
    let optionsForNextNode: ChatbotNode['options'] | undefined = undefined;

    let contextToPass: any = actionContext;
    if (requiresAuth && user) {
        contextToPass = user.id;
    }

    if (action) {
      const response = await executeChatbotAction(action, contextToPass);
      finalNextNodeId = response.fallbackNode || response.nodeId || nextNodeId;
      optionsForNextNode = response.options;

      if (response.success && response.data) {
          if (Array.isArray(response.data)) {
            botMessageContent = (
              <div className="space-y-4">
                <p>{response.message}</p>
                {response.data.map((item: any) => {
                  if (item.destination) { // Assuming it's a Tour object
                    return <TourCard key={item.id} tour={{ ...item, date: new Date(item.date) }} />;
                  } else {
                    return (
                      <div key={item.id || item.dni} className="p-3 border rounded-lg bg-background/50 text-xs">
                        <p className="font-bold">{item.fullName}</p>
                        <p>DNI: {item.dni}</p>
                        {item.tripCount !== undefined && <p>Viajes: {item.tripCount}</p>}
                      </div>
                    )
                  }
                })}
              </div>
            );
          } else if (response.data.contactInfo) {
                 botMessageContent = (
                    <div className="space-y-3">
                        <p>{response.message}</p>
                        <div className="space-y-2 text-sm p-3 border rounded-md bg-background/50">
                            {response.data.contactInfo.phone && (
                                <a href={`tel:${response.data.contactInfo.phone}`} className="flex items-center gap-2 hover:text-primary">
                                    <Phone className="w-4 h-4"/> 
                                    <span>{response.data.contactInfo.phone}</span>
                                </a>
                            )}
                             {response.data.contactInfo.email && (
                                <a href={`mailto:${response.data.contactInfo.email}`} className="flex items-center gap-2 hover:text-primary">
                                    <Mail className="w-4 h-4"/> 
                                    <span>{response.data.contactInfo.email}</span>
                                </a>
                            )}
                        </div>
                        <p className="text-xs text-muted-foreground">También puedes visitar nuestra página de contacto para más detalles.</p>
                    </div>
                );
          } else if (response.data.details) {
               botMessageContent = (
                <div className="space-y-2">
                    <p>{response.message}</p>
                    <div className="p-3 border rounded-md bg-background/50">
                        <p className="whitespace-pre-wrap font-mono text-xs">{response.data.details}</p>
                    </div>
                </div>
            );
          }
      } else {
           botMessageContent = response.message;
      }
    }

    const nextNode = {...getChatbotFlow(finalNextNodeId)};
    if (optionsForNextNode) {
        nextNode.options = optionsForNextNode;
    }
    
    // Set the context for the next interaction
    if (actionContext !== undefined) {
        setCurrentContext(actionContext);
    } else if (action === 'fetchTripDetailsByName') {
        // After searching a trip, its context should be available for pre-booking
        const lastUserMsg = messages[messages.length-1];
        if (lastUserMsg?.role === 'bot' && lastUserMsg.context) {
             setCurrentContext(lastUserMsg.context);
        }
    }


    if (!botMessageContent) {
      botMessageContent = nextNode.message;
    }
    
    setMessages(prev => [...prev, { role: "bot", content: botMessageContent, nodeId: finalNextNodeId, context: contextToPass }]);
    setCurrentNode(nextNode);
    setIsLoading(false);
  }

  const handleBack = (nodeId?: string) => {
    if (!nodeId) {
      startChat();
      return;
    }
    
    const currentNodeMessageIndex = messages.findLastIndex(m => m.nodeId === nodeId);

    if (currentNodeMessageIndex > 0) {
        const previousBotMessageIndex = messages.slice(0, currentNodeMessageIndex).findLastIndex(m => m.role === 'bot');
        if (previousBotMessageIndex !== -1) {
            const previousBotMessage = messages[previousBotMessageIndex];
            const previousNode = getChatbotFlow(previousBotMessage.nodeId || 'start');
            setMessages(prev => prev.slice(0, previousBotMessageIndex + 1));
            setCurrentNode(previousNode);
            setCurrentContext(previousBotMessage.context);
            if (previousNode.id === 'tag_selection') {
                setSelectedTags([]);
            }
            return;
        }
    }
    
    startChat();
  }

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        className="h-16 w-16 rounded-full bg-primary text-primary-foreground shadow-2xl transition-transform duration-300 hover:scale-110 active:scale-100 group"
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
                          {currentNode.id === 'tag_selection' && selectedTags.length > 0 && (
                            <Button onClick={() => handleOptionClick('Buscar', 'trips_result', 'searchTripsByAttribute')} className="w-full rounded-full shadow-sm">
                                <Search className="w-4 h-4 mr-2"/>
                                Buscar ({selectedTags.length})
                            </Button>
                          )}
                          {currentNode.options.map((opt, i) => {
                            const isTagSelection = currentNode.id === 'tag_selection';
                            const isSelected = isTagSelection && selectedTags.includes(opt.actionContext);
                            
                            return (
                                <Button key={i} variant={isSelected ? "default" : "outline"} onClick={() => {
                                    if(isTagSelection && opt.action === 'fetchAvailableTags') {
                                        handleTagToggle(opt.actionContext);
                                    } else {
                                        handleOptionClick(opt.text, opt.next, opt.action, opt.actionContext, opt.isExternalLink, opt.requiresAuth);
                                    }
                                }} disabled={isLoading || (opt.requiresAuth && authLoading) || (opt.requiresAuth && !user)} className="rounded-full shadow-sm">
                                    {opt.text}
                                </Button>
                            )
                          })}
                      </div>
                  )}
                  {currentNode.isUserInput && (
                      <form onSubmit={(e) => { e.preventDefault(); handleUserInput(input); }} className="flex w-full space-x-2">
                          <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder={currentNode.message} disabled={isLoading} className="rounded-full h-11"/>
                          <Button type="submit" size="icon" disabled={isLoading || !input.trim()} className="rounded-full h-11 w-11"><CornerDownLeft className="h-4 w-4" /></Button>
                      </form>
                  )}
                   <Separator className="my-2" />
                  {currentNode.id !== 'start' && <Button variant="ghost" size="sm" className="w-full text-muted-foreground hover:text-primary" onClick={() => handleBack(currentNode.id)}><ArrowLeft className="mr-2 h-4 w-4"/> Volver</Button>}
              </div>
            </SheetFooter>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
