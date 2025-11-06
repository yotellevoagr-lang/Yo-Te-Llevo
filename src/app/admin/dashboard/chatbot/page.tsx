
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
import { Loader2, PlusCircle, Trash2, Save, Bot, List, Eye, GripVertical } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

const availableActions = [
  'fetchFeaturedTours', 'fetchAllTours', 'fetchPassengerByDNI', 
  'fetchFamilyGroup', 'getFaqAnswer', 'fetchTripDetailsByName', 
  'searchTripsByAttribute', 'fetchActiveReservations', 'fetchPaymentStatus', 
  'fetchBoardingPass', 'getTripStatus', 'askForChildren', 
  'calculatePrebookingPrice', 'fetchContactInfo', 'fetchAvailableTags'
];

function ChatbotListView({ nodes, onNodeChange, onOptionChange, addOption, removeOption, handleSaveNode, handleDeleteNode, isSaving, originalNodeIds, addNewNode }: any) {
  return (
    <Card>
      <CardHeader>
          <CardTitle className="flex items-center gap-2"><Bot className="w-6 h-6"/> Flujos de Conversación</CardTitle>
          <CardDescription>Cada sección es un "paso" en la conversación del bot. Edita su mensaje y las opciones que le da al usuario.</CardDescription>
      </CardHeader>
      <CardContent>
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
            <AccordionItem value={node.id} key={originalId} className="border rounded-lg">
              <AccordionTrigger className="px-4 hover:no-underline text-base font-semibold">
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

function DraggableNode({ node, position, onNodeClick, isSelected }: { node: ChatbotNode, position: { x: number, y: number }, onNodeClick: (id: string) => void, isSelected: boolean }) {
    const {attributes, listeners, setNodeRef, transform} = useDraggable({
        id: node.id,
    });
    
    const style = transform ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    } : {
        left: `${position.x}px`,
        top: `${position.y}px`,
    };

    return (
        <div ref={setNodeRef} style={style} className="absolute z-10" onClick={() => onNodeClick(node.id)}>
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

function ChatbotVisualView({ nodes, nodePositions, handleDragEnd, onNodeClick, selectedNodeId }: any) {
    const nodeMap = new Map(nodes.map((node: ChatbotNode) => [node.id, node]));

    return (
        <Card className="h-[70vh] relative overflow-auto">
             <CardHeader className="absolute top-0 left-0 z-20 bg-background/80 backdrop-blur-sm rounded-t-lg w-full">
                <CardTitle>Editor Visual (En Construcción)</CardTitle>
                <CardDescription>Arrastra los nodos para organizar el flujo. Haz clic para seleccionar.</CardDescription>
            </CardHeader>
            <DndContext onDragEnd={handleDragEnd}>
                <div className="w-full h-full bg-muted/30 rounded-b-lg relative">
                    <svg className="absolute inset-0 w-full h-full pointer-events-none">
                        <defs>
                            <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                                <path d="M 0 0 L 10 5 L 0 10 z" fill="hsl(var(--primary))" />
                            </marker>
                        </defs>
                         {nodes.map((node: ChatbotNode) => {
                             const startPos = nodePositions[node.id];
                             if (!startPos) return null;
                             
                             return node.options.map((opt, index) => {
                                 const endNode = nodeMap.get(opt.next);
                                 const endPos = endNode ? nodePositions[endNode.id] : null;

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
                            position={nodePositions[node.id] || { x: 50, y: 50 }} 
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
  const [view, setView] = useState<'list' | 'visual'>('list');
  const [nodePositions, setNodePositions] = useState<Record<string, {x: number, y: number}>>({});
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const { toast } = useToast();
  const originalNodeIds = useRef(new Map<string, string>());

  const fetchNodes = async () => {
    setIsLoading(true);
    const nodesData = await getAllFromCollection_client<ChatbotNode>('chatbot_flows');
    const sortedNodes = nodesData.sort((a, b) => a.id.localeCompare(b.id));
    setNodes(sortedNodes);

    // Initialize positions for visual editor
    setNodePositions(prevPos => {
        const newPos: Record<string, {x: number, y: number}> = {};
        sortedNodes.forEach((node, index) => {
            if (prevPos[node.id]) {
                newPos[node.id] = prevPos[node.id];
            } else {
                newPos[node.id] = { x: 50 + (index % 5) * 280, y: 150 + Math.floor(index / 5) * 150 };
            }
        });
        return newPos;
    });

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
          
          // ID has changed, need to delete the old document
          if (originalId && newId !== originalId) {
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
  
  const handleDragEnd = (event: any) => {
      const {active, delta} = event;
      setNodePositions(prev => ({
          ...prev,
          [active.id]: {
              x: (prev[active.id]?.x || 0) + delta.x,
              y: (prev[active.id]?.y || 0) + delta.y,
          }
      }));
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
        <Tabs value={view} onValueChange={(v) => setView(v as 'list' | 'visual')} className="w-auto">
            <TabsList>
                <TabsTrigger value="list"><List className="w-4 h-4 mr-2"/>Vista de Lista</TabsTrigger>
                <TabsTrigger value="visual"><Eye className="w-4 h-4 mr-2"/>Vista Visual</TabsTrigger>
            </TabsList>
        </Tabs>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin"/></div>
      ) : view === 'list' ? (
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
        />
      ) : (
        <ChatbotVisualView 
            nodes={nodes}
            nodePositions={nodePositions}
            handleDragEnd={handleDragEnd}
            onNodeClick={setSelectedNodeId}
            selectedNodeId={selectedNodeId}
        />
      )}
    </div>
  );
}
