
"use client"

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getAllFromCollection_client, saveDocument, deleteDocument } from "@/lib/firestore-services";
import type { ChatbotNode } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Loader2, PlusCircle, Trash2, Save, Bot } from "lucide-react";

const availableActions = [
  'fetchFeaturedTours', 'fetchAllTours', 'fetchPassengerByDNI', 
  'fetchFamilyGroup', 'getFaqAnswer', 'fetchTripDetailsByName', 
  'searchTripsByAttribute', 'fetchActiveReservations', 'fetchPaymentStatus', 
  'fetchBoardingPass', 'getTripStatus', 'askForChildren', 
  'calculatePrebookingPrice', 'fetchContactInfo', 'fetchAvailableTags'
];

export default function ChatbotEditorPage() {
  const [nodes, setNodes] = useState<ChatbotNode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState<string | null>(null);
  const { toast } = useToast();
  const originalNodeIds = useRef(new Map<string, string>());

  const fetchNodes = async () => {
    setIsLoading(true);
    const nodesData = await getAllFromCollection_client<ChatbotNode>('chatbot_flows');
    const sortedNodes = nodesData.sort((a, b) => a.id.localeCompare(b.id));
    setNodes(sortedNodes);
    originalNodeIds.current.clear();
    sortedNodes.forEach(node => originalNodeIds.current.set(node.id, node.id));
    setIsLoading(false);
  }

  useEffect(() => {
    fetchNodes();
  }, []);

  const handleNodeChange = (originalId: string, field: keyof ChatbotNode, value: any) => {
    setNodes(prev => prev.map(n => {
        const nodeOriginalId = originalNodeIds.current.get(n.id) || n.id;
        if(nodeOriginalId === originalId) {
            return { ...n, [field]: value };
        }
        return n;
    }));
  };
  
  const handleOptionChange = (originalId: string, optionIndex: number, field: string, value: any) => {
      setNodes(prev => prev.map(n => {
          const nodeOriginalId = originalNodeIds.current.get(n.id) || n.id;
          if (nodeOriginalId === originalId) {
              const newOptions = [...n.options];
              newOptions[optionIndex] = { ...newOptions[optionIndex], [field]: value };
              return { ...n, options: newOptions };
          }
          return n;
      }));
  }
  
  const addOption = (originalId: string) => {
    setNodes(prev => prev.map(n => {
        const nodeOriginalId = originalNodeIds.current.get(n.id) || n.id;
        if (nodeOriginalId === originalId) {
            return { ...n, options: [...n.options, { text: 'Nueva Opción', next: 'start' }] }
        }
        return n;
    }));
  }
  
  const removeOption = (originalId: string, optionIndex: number) => {
    setNodes(prev => prev.map(n => {
        const nodeOriginalId = originalNodeIds.current.get(n.id) || n.id;
        if (nodeOriginalId === originalId) {
            return { ...n, options: n.options.filter((_, i) => i !== optionIndex) }
        }
        return n;
    }));
  }
  
  const addNewNode = () => {
    const tempId = `new_node_${Date.now()}`;
    const newNode: ChatbotNode = {
      id: tempId,
      message: "Nuevo mensaje del bot.",
      options: [{ text: "Volver al inicio", next: "start" }],
    };
    setNodes(prev => [...prev, newNode].sort((a, b) => a.id.localeCompare(b.id)));
    originalNodeIds.current.set(tempId, tempId);
  }

  const handleSaveNode = async (node: ChatbotNode) => {
      const originalId = originalNodeIds.current.get(node.id) || node.id;
      const newId = node.id;

      if (!newId.trim()) {
          toast({ title: "Error", description: "El ID del nodo no puede estar vacío.", variant: "destructive"});
          return;
      }
      
      setIsSaving(originalId);
      try {
          const { id, ...dataToSave } = node;
          
          if (originalId && newId !== originalId) {
              // ID has changed, delete the old document
              await deleteDocument('chatbot_flows', originalId);
          }

          await saveDocument('chatbot_flows', dataToSave, newId);
          
          // Update the original ID tracking
          originalNodeIds.current.set(newId, newId);
          if (originalId && newId !== originalId) {
              originalNodeIds.current.delete(originalId);
          }
          
          toast({ title: "¡Nodo Guardado!", description: `El paso "${newId}" ha sido guardado correctamente.`});

          // A full refetch is the safest way to ensure UI consistency if IDs change
          await fetchNodes();

      } catch (error) {
          console.error(error);
          toast({ title: "Error", description: "No se pudo guardar el nodo.", variant: "destructive"});
      } finally {
          setIsSaving(null);
      }
  }

  const handleDeleteNode = async (nodeId: string) => {
      if (confirm(`¿Estás seguro de que quieres eliminar el nodo "${nodeId}"? Esta acción no se puede deshacer.`)) {
          try {
              await deleteDocument('chatbot_flows', nodeId);
              originalNodeIds.current.delete(nodeId);
              setNodes(prev => prev.filter(n => n.id !== nodeId));
              toast({ title: "Nodo Eliminado", variant: "destructive"});
          } catch (error) {
              console.error(error);
              toast({ title: "Error", description: "No se pudo eliminar el nodo.", variant: "destructive"});
          }
      }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Editor del Asistente Virtual</h2>
          <p className="text-muted-foreground">
            Personaliza los flujos de conversación, mensajes y acciones del chatbot.
          </p>
        </div>
        <div className="flex items-center gap-2 self-end sm:self-center">
            <Button onClick={addNewNode}>
                <PlusCircle className="mr-2 h-4 w-4"/>
                Añadir Nuevo Paso
            </Button>
        </div>
      </div>
      <Card>
        <CardHeader>
            <CardTitle className="flex items-center gap-2"><Bot className="w-6 h-6"/> Flujos de Conversación</CardTitle>
            <CardDescription>Cada sección es un "paso" en la conversación del bot. Edita su mensaje y las opciones que le da al usuario.</CardDescription>
        </CardHeader>
        <CardContent>
            {isLoading ? <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin"/></div> : (
              <Accordion type="single" collapsible className="w-full space-y-2">
                {nodes.map(node => {
                  const originalId = originalNodeIds.current.get(node.id) || node.id;
                  return (
                  <AccordionItem value={node.id} key={originalId} className="border rounded-lg">
                    <AccordionTrigger className="px-4 hover:no-underline text-base font-semibold">
                      {node.id}
                    </AccordionTrigger>
                    <AccordionContent className="p-4 pt-0 space-y-4">
                      <div className="space-y-2">
                          <Label htmlFor={`id-${originalId}`}>ID del Nodo (¡Cuidado al cambiar!)</Label>
                          <Input 
                            id={`id-${originalId}`} 
                            value={node.id} 
                            onChange={e => handleNodeChange(originalId, 'id', e.target.value)}
                           />
                      </div>
                      <div className="space-y-2">
                          <Label htmlFor={`message-${originalId}`}>Mensaje del Bot</Label>
                          <Textarea id={`message-${originalId}`} value={node.message} onChange={e => handleNodeChange(originalId, 'message', e.target.value)} />
                      </div>
                       <div className="flex items-center space-x-2">
                          <Switch id={`isUserInput-${originalId}`} checked={!!node.isUserInput} onCheckedChange={checked => handleNodeChange(originalId, 'isUserInput', checked)} />
                          <Label htmlFor={`isUserInput-${originalId}`}>Este paso espera una respuesta escrita del usuario</Label>
                      </div>

                      <h4 className="font-semibold pt-4 border-t">Opciones (Botones)</h4>
                      <div className="space-y-3">
                          {node.options.map((opt, index) => (
                              <div key={index} className="p-3 border rounded-md space-y-3 bg-muted/50 relative">
                                  <Button variant="ghost" size="icon" className="absolute top-1 right-1 h-7 w-7 text-destructive" onClick={() => removeOption(originalId, index)}><Trash2 className="w-4 h-4"/></Button>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                      <div className="space-y-1">
                                          <Label>Texto del Botón</Label>
                                          <Input value={opt.text} onChange={e => handleOptionChange(originalId, index, 'text', e.target.value)} />
                                      </div>
                                      <div className="space-y-1">
                                          <Label>Siguiente Paso (ID)</Label>
                                          <Input value={opt.next} onChange={e => handleOptionChange(originalId, index, 'next', e.target.value)} placeholder="ID del siguiente nodo" />
                                      </div>
                                  </div>
                                   <div className="space-y-1">
                                      <Label>Acción a Ejecutar (Opcional)</Label>
                                      <Select value={opt.action || ''} onValueChange={value => handleOptionChange(originalId, index, 'action', value === 'none' ? undefined : value)}>
                                          <SelectTrigger><SelectValue placeholder="Ninguna"/></SelectTrigger>
                                          <SelectContent>
                                              <SelectItem value="none">Ninguna</SelectItem>
                                              {availableActions.map(act => <SelectItem key={act} value={act}>{act}</SelectItem>)}
                                          </SelectContent>
                                      </Select>
                                  </div>
                              </div>
                          ))}
                           <Button variant="outline" size="sm" onClick={() => addOption(originalId)}>
                              <PlusCircle className="mr-2 h-4 w-4"/> Añadir Opción
                          </Button>
                      </div>

                       <div className="flex justify-end gap-2 pt-4 border-t">
                           <Button variant="destructive" size="sm" onClick={() => handleDeleteNode(node.id)}>Eliminar Nodo</Button>
                           <Button size="sm" onClick={() => handleSaveNode(node)} disabled={isSaving === originalId}>
                               {isSaving === originalId ? <Loader2 className="animate-spin mr-2"/> : <Save className="mr-2 h-4 w-4"/>}
                               Guardar Cambios
                           </Button>
                       </div>
                    </AccordionContent>
                  </AccordionItem>
                )})}
              </Accordion>
            )}
        </CardContent>
      </Card>
    </div>
  );
}
