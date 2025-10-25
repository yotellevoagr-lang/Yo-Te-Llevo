
"use client"

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Trash2, AlertCircle, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { HistoryItem } from "@/lib/types";

interface HistoryViewerProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  historyKey: string;
  title: string;
  setHasDueItems: (hasDue: boolean) => void;
}

const DELETION_THRESHOLD_DAYS = 30;
const NOTIFICATION_THRESHOLD_DAYS = 10;

export function HistoryViewer({ isOpen, onOpenChange, historyKey, title, setHasDueItems }: HistoryViewerProps) {
  const { toast } = useToast();
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) {
      // Clean up old items and check for notifications
      const now = new Date();
      const storedHistory: HistoryItem[] = JSON.parse(localStorage.getItem(historyKey) || "[]");
      let hasDue = false;

      const updatedHistory = storedHistory.filter(item => {
        const savedDate = new Date(item.savedAt);
        const daysSinceSaved = (now.getTime() - savedDate.getTime()) / (1000 * 3600 * 24);
        if (daysSinceSaved > DELETION_THRESHOLD_DAYS) {
          return false; // Item is too old, filter it out
        }
        if (DELETION_THRESHOLD_DAYS - daysSinceSaved <= NOTIFICATION_THRESHOLD_DAYS) {
          hasDue = true;
        }
        return true;
      });

      setHistory(updatedHistory);
      setHasDueItems(hasDue);
      setSelectedItems([]);
      
      // If items were deleted, update localStorage
      if (updatedHistory.length !== storedHistory.length) {
        localStorage.setItem(historyKey, JSON.stringify(updatedHistory));
      }
    }
  }, [isOpen, historyKey, setHasDueItems]);

  const handleDelete = () => {
    if (selectedItems.length === 0) return;
    const newHistory = history.filter(item => !selectedItems.includes(item.id));
    setHistory(newHistory);
    localStorage.setItem(historyKey, JSON.stringify(newHistory));
    setSelectedItems([]);
    toast({ title: `${selectedItems.length} elemento(s) eliminado(s).` });
  };

  const handleItemSelect = (id: string, checked: boolean) => {
    setSelectedItems(prev => checked ? [...prev, id] : prev.filter(i => i !== id));
  };

  const selectAll = () => {
    if (selectedItems.length === history.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(history.map(item => item.id));
    }
  }
  
  const isDueForDeletion = (item: HistoryItem): boolean => {
      const savedDate = new Date(item.savedAt);
      const daysSinceSaved = (new Date().getTime() - savedDate.getTime()) / (1000 * 3600 * 24);
      return DELETION_THRESHOLD_DAYS - daysSinceSaved <= NOTIFICATION_THRESHOLD_DAYS;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Aquí puedes ver o eliminar los elementos guardados. Los elementos se borrarán automáticamente después de {DELETION_THRESHOLD_DAYS} días.
          </DialogDescription>
        </DialogHeader>
        
        <div className="border rounded-lg flex-1 flex flex-col overflow-hidden">
            <div className="p-2 border-b flex items-center gap-4">
                <Checkbox 
                    id="select-all"
                    checked={selectedItems.length === history.length && history.length > 0}
                    onCheckedChange={selectAll}
                />
                <Label htmlFor="select-all" className="font-normal flex-1">
                    Seleccionar Todo ({selectedItems.length})
                </Label>
                <Button variant="destructive" size="sm" onClick={handleDelete} disabled={selectedItems.length === 0}>
                    <Trash2 className="mr-2 h-4 w-4"/> Eliminar
                </Button>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-2 space-y-1">
                {history.length > 0 ? (
                  history.map((item) => (
                    <div key={item.id} className="flex items-center gap-2 p-2 rounded-md hover:bg-muted">
                        <Checkbox 
                            id={item.id} 
                            checked={selectedItems.includes(item.id)}
                            onCheckedChange={(checked) => handleItemSelect(item.id, !!checked)}
                        />
                        <FileText className="w-4 h-4 text-muted-foreground"/>
                        <Label htmlFor={item.id} className="font-normal flex-1 cursor-pointer">
                            {item.name}
                        </Label>
                        {isDueForDeletion(item) && <AlertCircle className="w-4 h-4 text-destructive" title="Se eliminará pronto"/>}
                    </div>
                  ))
                ) : (
                  <div className="text-center text-muted-foreground p-8">
                    No hay elementos en el historial.
                  </div>
                )}
              </div>
            </ScrollArea>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
