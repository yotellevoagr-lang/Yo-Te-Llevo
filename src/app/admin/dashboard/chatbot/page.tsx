
"use client"

import { useState, useEffect, useRef } from "react";
import { DndContext, useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
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
import { Loader2, PlusCircle, Trash2, Save, Bot, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

const availableActions = [
  'fetchFeaturedTours', 'fetchAllTours', 'fetchPassengerByDNI', 
  'fetchFamilyGroup', 'getFaqAnswer', 'fetchTripDetailsByName', 
  'searchTripsByAttribute', 'fetchActiveReservations', 'fetchPaymentStatus', 
  'fetchBoardingPass', 'getTripStatus', 'askForChildren', 
  'calculatePrebookingPrice', 'fetchContactInfo', 'fetchAvailableTags'
];

function ChatbotListView({ nodes, onNodeChange, onOptionChange, addOption, removeOption, handleSaveNode, handleDeleteNode, isSaving, originalNodeIds, addNewNode, onNodeClick, selectedNodeId }: any) {
  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
          <CardTitle className="flex items-center gap-2"><Bot className="w-6 h-6"/> Editor de Flujos</CardTitle>
          <CardDescription>Crea, edita y elimina los pasos de la conversación del bot.</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto">
          <div className="flex justify-end mb-4">
             <Button onClick={addNewNode}>
                  <PlusCircle className="mr-2 h-4 w-4"/>
                  Añadir Nuevo Paso
              </Button>
          </div>
        <Accordion type="single" collapsible className="w-full space-y-2">
          {nodes.map((node: any) => {
            const originalId = originalNodeIds.current.get(node.id) || node.id;
            return (
            <AccordionItem value={node.id} key={originalId} className={cn("border rounded-lg", selectedNodeId === node.id && 'border-primary')}>
              <AccordionTrigger 
                className="px-4 hover:no-underline text-base font-semibold"
                onClick={() => onNodeClick(node.id)}
              >
                {node.id}
              </AccordionTrigger>
              <AccordionContent className="p-4 pt-0 space-y-4">
                <div className="space-y-2">
                    <Label htmlFor={`id-${originalId}`}>ID del Nodo (en español, sin espacios)</Label>
                    <Input 
                      id={`id-${originalId}`} 
                      value={node.id} 
                      onChange={e => onNodeChange(originalId, 'id', e.target.value)}
                     />
                </div>
                <div className="space-y-2">
                    <Label htmlFor={`message-${originalId}`}>Mensaje del Bot</Label>
                    <Textarea id={`message-${originalId}`} value={node.message} onChange={e => onNodeChange(originalId, 'message', e.target.value)} />
                </div>
                 <div className="flex items-center space-x-2">
                    <Switch id={`isUserInput-${originalId}`} checked={!!node.isUserInput} onCheckedChange={checked => onNodeChange(originalId, 'isUserInput', checked)} />
                    <Label htmlFor={`isUserInput-${originalId}`}>Este paso espera una respuesta escrita del usuario</Label>
                </div>

                <h4 className="font-semibold pt-4 border-t">Opciones (Botones)</h4>
                <div className="space-y-3">
                    {node.options.map((opt: any, index: number) => (
                        <div key={index} className="p-3 border rounded-md space-y-3 bg-muted/50 relative">
                            <Button variant="ghost" size="icon" className="absolute top-1 right-1 h-7 w-7 text-destructive" onClick={() => removeOption(originalId, index)}><Trash2 className="w-4 h-4"/></Button>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <Label>Texto del Botón</Label>
                                    <Input value={opt.text} onChange={e => onOptionChange(originalId, index, 'text', e.target.value)} />
                                </div>
                                <div className="space-y-1">
                                    <Label>Siguiente Paso (ID)</Label>
                                    <Input value={opt.next} onChange={e => onOptionChange(originalId, index, 'next', e.target.value)} placeholder="ID del siguiente nodo" />
                                </div>
                            </div>
                             <div className="space-y-1">
                                <Label>Acción a Ejecutar (Opcional)</Label>
                                <Select value={opt.action || ''} onValueChange={value => onOptionChange(originalId, index, 'action', value === 'none' ? undefined : value)}>
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
      </CardContent>
    </Card>
  );
}

function DraggableNode({ node, onNodeClick, isSelected }: { node: ChatbotNode, onNodeClick: (id: string) => void, isSelected: boolean }) {
    const {attributes, listeners, setNodeRef, transform} = useDraggable({
        id: node.id,
    });
    
    const style: React.CSSProperties = transform ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        position: 'absolute',
        left: node.position?.x || 50,
        top: node.position?.y || 50,
    } : {
        position: 'absolute',
        left: node.position?.x || 50,
        top: node.position?.y || 50,
    };

    return (
        <div ref={setNodeRef} style={style} className="z-10" onClick={() => onNodeClick(node.id)}>
             <Card className={cn("w-64 bg-background shadow-lg hover:shadow-2xl transition-shadow border-2", isSelected && "border-primary")}>
                <CardHeader className="p-2 border-b cursor-move" {...listeners} {...attributes}>
                    <CardTitle className="text-sm flex items-center gap-2">
                        <GripVertical className="text-muted-foreground" />
                        {node.id}
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-3 text-xs">
                    <p className="line-clamp-3">{node.message}</p>
                </CardContent>
            </Card>
        </div>
    );
}

function ChatbotVisualView({ nodes, onNodeClick, selectedNodeId, onDragEnd }: any) {
    const nodeMap = new Map(nodes.map((node: ChatbotNode) => [node.id, node]));

    return (
        <Card className="h-full relative overflow-auto">
             <CardHeader>
                <CardTitle>Lienzo Visual</CardTitle>
                <CardDescription>Arrastra los nodos para organizar el flujo. Haz clic para seleccionar y editar en el panel izquierdo.</CardDescription>
            </CardHeader>
            <DndContext onDragEnd={onDragEnd}>
                <div className="w-full h-full bg-muted/30 rounded-b-lg relative">
                    <svg className="absolute inset-0 w-full h-full pointer-events-none">
                        <defs>
                            <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                                <path d="M 0 0 L 10 5 L 0 10 z" fill="hsl(var(--primary))" />
                            </marker>
                        </defs>
                         {nodes.map((node: ChatbotNode) => {
                             const startPos = node.position;
                             if (!startPos) return null;
                             
                             return node.options.map((opt, index) => {
                                 const endNode = nodeMap.get(opt.next);
                                 const endPos = endNode?.position;

                                 if (!endPos) return null;
                                 
                                 const startX = startPos.x + 128; // center of node
                                 const startY = startPos.y + 40; // middle of node
                                 const endX = endPos.x + 128;
                                 const endY = endPos.y + 40;

                                 // Simple straight line for now
                                 return (
                                     <line 
                                         key={`${node.id}-${opt.next}-${index}`}
                                         x1={startX} y1={startY}
                                         x2={endX} y2={endY}
                                         stroke="hsl(var(--primary) / 0.5)"
                                         strokeWidth="2"
                                         markerEnd="url(#arrow)"
                                     />
                                 )
                             })
                         })}
                    </svg>

                    {nodes.map((node: ChatbotNode) => (
                        <DraggableNode 
                            key={node.id} 
                            node={node} 
                            onNodeClick={onNodeClick}
                            isSelected={selectedNodeId === node.id}
                        />
                    ))}
                </div>
            </DndContext>
        </Card>
    );
}

export default function ChatbotEditorPage() {
  const [nodes, setNodes] = useState<ChatbotNode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const { toast } = useToast();
  const originalNodeIds = useRef(new Map<string, string>());

  const fetchNodes = async () => {
    setIsLoading(true);
    const nodesData = await getAllFromCollection_client<ChatbotNode>('chatbot_flows');
    const sortedNodes = nodesData.sort((a, b) => a.id.localeCompare(b.id));

    const nodesWithPositions = sortedNodes.map((node, index) => ({
      ...node,
      position: node.position || { x: 50 + (index % 3) * 280, y: 50 + Math.floor(index / 3) * 150 }
    }));

    setNodes(nodesWithPositions);

    originalNodeIds.current.clear();
    nodesWithPositions.forEach(node => originalNodeIds.current.set(node.id, node.id));
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
            return { ...n, options: [...n.options, { text: 'Nueva Opción', next: 'inicio' }] }
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
    const tempId = `nuevo_nodo_${Date.now()}`;
    const newNode: ChatbotNode = {
      id: tempId,
      message: "Nuevo mensaje del bot.",
      options: [{ text: "Volver al inicio", next: "inicio" }],
      position: { x: 50, y: 50 },
    };
    setNodes(prev => [...prev, newNode].sort((a, b) => a.id.localeCompare(b.id)));
    originalNodeIds.current.set(tempId, tempId);
    setSelectedNodeId(tempId);
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
          // The node object in state already has the updated position, so we save it directly.
          const { id, ...dataToSave } = node;
          
          if (originalId && newId !== originalId) {
              await deleteDocument('chatbot_flows', originalId);
          }

          await saveDocument('chatbot_flows', dataToSave, newId);
          
          originalNodeIds.current.set(newId, newId);
          if (originalId && newId !== originalId) {
              originalNodeIds.current.delete(originalId);
          }
          
          toast({ title: "¡Nodo Guardado!", description: `El paso "${newId}" ha sido guardado correctamente.`});
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
  
    const handleDragEnd = async (event: any) => {
      const {active, delta} = event;
      setNodes(prevNodes => 
        prevNodes.map(node => {
          if (node.id === active.id) {
            const newPosition = {
              x: (node.position?.x || 50) + delta.x,
              y: (node.position?.y || 50) + delta.y,
            };
            return { ...node, position: newPosition };
          }
          return node;
        })
      );
    };

  return (
    <div className="h-[calc(100vh-10rem)] grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 h-full">
            {isLoading ? (
                 <div className="flex justify-center items-center h-full"><Loader2 className="w-8 h-8 animate-spin"/></div>
            ) : (
                <ChatbotListView 
                    nodes={nodes}
                    onNodeChange={handleNodeChange}
                    onOptionChange={handleOptionChange}
                    addOption={addOption}
                    removeOption={removeOption}
                    handleSaveNode={handleSaveNode}
                    handleDeleteNode={handleDeleteNode}
                    isSaving={isSaving}
                    originalNodeIds={originalNodeIds}
                    addNewNode={addNewNode}
                    onNodeClick={setSelectedNodeId}
                    selectedNodeId={selectedNodeId}
                />
            )}
        </div>
        <div className="md:col-span-2 h-full">
             {isLoading ? (
                 <div className="flex justify-center items-center h-full"><Loader2 className="w-8 h-8 animate-spin"/></div>
            ) : (
                <ChatbotVisualView 
                    nodes={nodes}
                    onNodeClick={setSelectedNodeId}
                    selectedNodeId={selectedNodeId}
                    onDragEnd={handleDragEnd}
                />
            )}
        </div>
    </div>
  );
}
