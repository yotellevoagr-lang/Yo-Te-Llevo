

"use client"

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import type { CustomLayoutConfig, LayoutCategory } from "@/lib/types";
import type { Layout, Floor, Cell } from "@/lib/layouts";
import { Trash2, PlusCircle, Armchair, Waves, PersonStandingIcon, BusIcon, ChefHatIcon, ShieldIcon, BedDouble, Anchor, ListTree } from "lucide-react";
import { cn } from "@/lib/utils";
import { Switch } from "../ui/switch";

interface LayoutEditorProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSave: (originalKey: string | null, config: CustomLayoutConfig) => void;
  category?: LayoutCategory | null;
  layoutKey?: string | null;
  layoutConfig?: CustomLayoutConfig;
}

type SelectedCell = { floorKey: string; row: number; col: number };

const defaultCell: Cell = { type: 'empty' };

const createGrid = (rows: number, cols: number): Cell[][] => {
    return Array(rows).fill(null).map(() => Array(cols).fill(defaultCell));
};

const flattenGrid = (grid: Cell[][]): Cell[] => grid.flat();
const unflattenGrid = (gridData: Cell[], cols: number): Cell[][] => {
    if (!cols || cols === 0) return [];
    const newGrid: Cell[][] = [];
    for (let i = 0; i < gridData.length; i += cols) {
        newGrid.push(gridData.slice(i, i + cols));
    }
    return newGrid;
};


const defaultFloor: Floor = { 
    name: "Planta Baja", 
    grid: {
        gridData: flattenGrid(createGrid(5,4)),
        cols: 4
    }
};

const SpecialCell = ({ type }: { type: Cell['type'] }) => {
    let content = null;
    const className = "text-muted-foreground/80 flex flex-col items-center justify-center text-center text-[9px] leading-tight font-medium h-full w-full rounded-md bg-muted/30";
    switch(type) {
        case 'pasillo':
            return <div className="w-full h-full" />;
        case 'escalera':
            content = <> <PersonStandingIcon className="w-4 h-4 mb-0.5" /> Esc. </>;
            break;
        case 'baño':
            content = <div className="text-xl">🚻</div>;
            break;
        case 'cafetera':
            content = <> <ChefHatIcon className="w-4 h-4 mb-0.5" /> Café </>;
            break;
        case 'chofer':
            content = <> <BusIcon className="w-4 h-4 mb-0.5" /> Chofer </>;
            break;
        case 'cabina':
            content = <> <ShieldIcon className="w-4 h-4 mb-0.5" /> Cabina </>;
            break;
        case 'anchor':
            content = <> <Anchor className="w-4 h-4 mb-0.5" /> Común </>;
            break;
        case 'waves':
            content = <> <Waves className="w-4 h-4 mb-0.5" /> Piscina </>;
            break;
        case 'empty':
             return <div className="w-full h-full" />;
        default:
            return <div className="w-full h-full" />;
    }
    return <div className={className}>{content}</div>;
};


const MultiCellEditor = ({ cells, onCellChange, category }: { cells: SelectedCell[], onCellChange: (newType: Cell['type']) => void, category: LayoutCategory }) => {
    
    const handleTypeChange = (type: Cell['type']) => {
        onCellChange(type);
    }

    const baseCellTypes = [
        { value: 'empty', label: 'Vacío', icon: <div className="w-4 h-4 border border-dashed rounded-sm" /> },
        { value: 'pasillo', label: 'Pasillo', icon: <div className="w-4 h-4 bg-gray-300 rounded-sm" /> },
    ];

    const categoryCellTypes: Record<LayoutCategory, typeof baseCellTypes> = {
        vehicles: [
            { value: 'seat', label: 'Asiento', icon: <Armchair className="w-4 h-4" /> },
            { value: 'baño', label: 'Baño', icon: <span className="text-base">🚻</span> },
            { value: 'escalera', label: 'Escalera', icon: <PersonStandingIcon className="w-4 h-4" /> },
            { value: 'chofer', label: 'Chofer', icon: <BusIcon className="w-4 h-4" /> },
            { value: 'cafetera', label: 'Cafetera', icon: <ChefHatIcon className="w-4 h-4" /> },
        ],
        airplanes: [
             { value: 'seat', label: 'Asiento', icon: <Armchair className="w-4 h-4" /> },
             { value: 'baño', label: 'Baño', icon: <span className="text-base">🚻</span> },
             { value: 'cabina', label: 'Cabina Piloto', icon: <ShieldIcon className="w-4 h-4" /> },
        ],
        cruises: [
            { value: 'cabin', label: 'Camarote', icon: <BedDouble className="w-4 h-4" /> },
            { value: 'baño', label: 'Baño Público', icon: <span className="text-base">🚻</span> },
            { value: 'escalera', label: 'Escalera/Ascensor', icon: <PersonStandingIcon className="w-4 h-4" /> },
            { value: 'anchor', label: 'Zona Común', icon: <Anchor className="w-4 h-4" /> },
            { value: 'waves', label: 'Piscina', icon: <Waves className="w-4 h-4" /> }
        ]
    }
    
    const cellTypes = [...baseCellTypes, ...categoryCellTypes[category]];

    return (
        <div className="p-4 space-y-4 border rounded-lg bg-muted/50">
            <h4 className="font-semibold">Edición Múltiple ({cells.length} celdas)</h4>
            <div className="space-y-2">
                <Label>Aplicar Tipo de Celda</Label>
                <Select onValueChange={(v) => handleTypeChange(v as Cell['type'])}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar tipo..."/></SelectTrigger>
                    <SelectContent>
                        {cellTypes.map(ct => (
                            <SelectItem key={ct.value} value={ct.value}>
                                <div className="flex items-center gap-2">
                                    {ct.icon}
                                    <span>{ct.label}</span>
                                </div>
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
             <Button variant="outline" size="sm" onClick={() => handleTypeChange('empty')} className="w-full">Limpiar selección</Button>
        </div>
    );
};


export function LayoutEditor({ isOpen, onOpenChange, onSave, category, layoutKey, layoutConfig }: LayoutEditorProps) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [layout, setLayout] = useState<Layout>({ floors: { 'floor_0': defaultFloor } });
  const [selectedCells, setSelectedCells] = useState<SelectedCell[]>([]);
  const [gridDimensions, setGridDimensions] = useState<Record<string, {rows: number | '', cols: number | ''}>>({});
  const [multiSelectMode, setMultiSelectMode] = useState(false);


  useEffect(() => {
    if (isOpen) {
      if (layoutConfig) {
        setName(layoutConfig.name);
        const initialLayout = { floors: { ...layoutConfig.layout.floors } };
        setLayout(initialLayout);

        const dims: Record<string, {rows: number | '', cols: number | ''}> = {};
        Object.entries(initialLayout.floors).forEach(([key, floor]) => {
            const grid = unflattenGrid(floor.grid.gridData, floor.grid.cols);
            dims[key] = { rows: grid.length, cols: grid[0]?.length || 0 };
        });
        setGridDimensions(dims);

      } else {
        setName("");
        const newLayout = { floors: { 'floor_0': defaultFloor } };
        setLayout(newLayout);
        const dims: Record<string, {rows: number | '', cols: number | ''}> = {};
        Object.entries(newLayout.floors).forEach(([key, floor]) => {
            const grid = unflattenGrid(floor.grid.gridData, floor.grid.cols);
            dims[key] = { rows: grid.length, cols: grid[0]?.length || 0 };
        });
        setGridDimensions(dims);
      }
      setSelectedCells([]);
      setMultiSelectMode(false);
    }
  }, [isOpen, layoutConfig]);

  const updateGridDimensions = (floorKey: string, dimension: 'rows' | 'cols', value: string) => {
    const newDims = { ...gridDimensions };
    const numericValue = value === '' ? '' : parseInt(value, 10);
    newDims[floorKey] = { ...newDims[floorKey], [dimension]: numericValue };
    setGridDimensions(newDims);

    if (typeof numericValue === 'number' && numericValue > 0) {
        const oldGrid = unflattenGrid(layout.floors[floorKey].grid.gridData, layout.floors[floorKey].grid.cols);
        const currentRows = oldGrid.length;
        const currentCol = oldGrid[0]?.length || 0;
        const newRows = dimension === 'rows' ? numericValue : currentRows;
        const newCols = dimension === 'cols' ? numericValue : currentCol;
        updateGrid(floorKey, newRows, newCols);
    }
  };


  const updateGrid = (floorKey: string, newRows: number, newCols: number) => {
    setLayout(prev => {
        const newLayout = { ...prev };
        const oldGrid = unflattenGrid(newLayout.floors[floorKey].grid.gridData, newLayout.floors[floorKey].grid.cols);
        const newGrid = Array.from({ length: newRows }, (_, r) => 
            Array.from({ length: newCols }, (_, c) => oldGrid[r]?.[c] || defaultCell)
        );
        newLayout.floors[floorKey].grid = {
            gridData: flattenGrid(newGrid),
            cols: newCols
        };
        return newLayout;
    });
  };
  
  const handleCellClick = (e: React.MouseEvent, floorKey: string, row: number, col: number) => {
    const cellIdentifier = { floorKey, row, col };

    if (multiSelectMode) {
        setSelectedCells(prev => {
            const isAlreadySelected = prev.some(c => c.floorKey === floorKey && c.row === row && c.col === col);
            if (isAlreadySelected) {
                return prev.filter(c => !(c.floorKey === floorKey && c.row === row && c.col === col));
            } else {
                return [...prev, cellIdentifier];
            }
        });
    } else {
        setSelectedCells([cellIdentifier]);
    }
  };


  const handleMultiCellChange = (newType: Cell['type']) => {
    if (selectedCells.length === 0) return;
  
    setLayout(prevLayout => {
        const newLayout = JSON.parse(JSON.stringify(prevLayout));
        let maxSeatNumber = 0;
        
        // Find the highest existing seat number in the entire layout
        for (const floor of Object.values(newLayout.floors)) {
            const grid = unflattenGrid(floor.grid.gridData, floor.grid.cols);
            for (const row of grid) {
                for (const cell of row) {
                    if (cell.type === 'seat' && cell.number > maxSeatNumber) {
                        maxSeatNumber = cell.number;
                    }
                }
            }
        }
  
        selectedCells.forEach(selected => {
            const { floorKey, row, col } = selected;
            const grid = unflattenGrid(newLayout.floors[floorKey].grid.gridData, newLayout.floors[floorKey].grid.cols);
            const currentCell = grid[row][col];
            
            // Only assign a new number if the cell is NOT already the target type.
            if (newType === 'seat' && currentCell.type !== 'seat') {
                maxSeatNumber++;
                grid[row][col] = { type: 'seat', number: maxSeatNumber };
            } else if (newType === 'cabin' && currentCell.type !== 'cabin') {
                grid[row][col] = { type: 'cabin', number: '', cabinType: 'Interior', capacity: 2 };
            } else if (newType !== 'seat' && newType !== 'cabin') {
                grid[row][col] = { type: newType };
            }
            newLayout.floors[floorKey].grid = {
                gridData: flattenGrid(grid),
                cols: grid[0]?.length || 0
            };
        });

        return newLayout;
    });
    setSelectedCells([]);
  };

  const handleSaveClick = () => {
    if (!name || !category) {
      toast({ title: "Error", description: "El nombre es obligatorio.", variant: "destructive" });
      return;
    }

    const uniqueIdentifiers = new Set<string>();
    let totalCapacity = 0;
    
    // Create a deep copy to modify for saving
    const layoutToSave = JSON.parse(JSON.stringify(layout));

    for (const floorKey in layoutToSave.floors) {
        const floor = layoutToSave.floors[floorKey];
        const grid = unflattenGrid(floor.grid.gridData, floor.grid.cols);

        for (let i = 0; i < grid.length; i++) {
            for (const cell of grid[i]) {
                let identifier: string | null = null;
                if (cell.type === 'seat') {
                    if (cell.number && cell.number > 0) identifier = `seat-${cell.number}`;
                    totalCapacity++;
                } else if (cell.type === 'cabin') {
                    if (cell.number) identifier = `cabin-${cell.number}`;
                    if (cell.capacity && cell.capacity > 0) totalCapacity += cell.capacity;
                }
                
                if (identifier) {
                    if (uniqueIdentifiers.has(identifier)) {
                         toast({ title: "Error", description: `Identificador duplicado: ${identifier.replace('-', ' ')}`, variant: "destructive" });
                         return;
                    }
                    uniqueIdentifiers.add(identifier);
                }
            }
        }
    }

    onSave(layoutKey, { name, capacity: totalCapacity, layout: layoutToSave });
  };
  
  const addFloor = () => {
      const newFloorKey = `floor_${Date.now()}`;
      const newFloor = { name: `Piso ${Object.keys(layout.floors).length + 1}`, grid: defaultFloor.grid };
      setLayout(prev => ({...prev, floors: {...prev.floors, [newFloorKey]: newFloor}}));
      setGridDimensions(prev => ({...prev, [newFloorKey]: { rows: unflattenGrid(newFloor.grid.gridData, newFloor.grid.cols).length, cols: newFloor.grid.cols }}));
  }
  
  const removeFloor = (keyToRemove: string) => {
       if (Object.keys(layout.floors).length <= 1) return;
       setLayout(prev => {
           const newFloors = {...prev.floors};
           delete newFloors[keyToRemove];
           return {...prev, floors: newFloors};
       });
       setGridDimensions(prev => {
           const newDims = {...prev};
           delete newDims[keyToRemove];
           return newDims;
       });
       setSelectedCells(prev => prev.filter(c => c.floorKey !== keyToRemove));
  }

  const categoryTitles: Record<LayoutCategory, string> = {
    vehicles: "Vehículo",
    airplanes: "Avión",
    cruises: "Crucero"
  }
  
  if (!category) return null;

  const title = layoutConfig ? `Editar ${categoryTitles[category]}` : `Nuevo ${categoryTitles[category]}`;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl flex flex-col max-h-[95vh] h-full">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Define el nombre, las dimensiones y el layout del transporte. Usa el interruptor para activar la selección múltiple.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-6 overflow-hidden">
            <div className="md:col-span-1 flex flex-col gap-4 overflow-y-auto pr-2">
                <div className="space-y-2">
                    <Label htmlFor="layoutName">Nombre del Tipo</Label>
                    <Input id="layoutName" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                 <div className="flex items-center space-x-2">
                    <Switch id="multi-select-mode" checked={multiSelectMode} onCheckedChange={setMultiSelectMode} />
                    <Label htmlFor="multi-select-mode" className="flex items-center gap-2 cursor-pointer"><ListTree className="w-4 h-4"/> Selección Múltiple</Label>
                </div>
                 <Button onClick={addFloor} variant="outline" size="sm">
                    <PlusCircle className="mr-2 h-4 w-4"/> Añadir Piso/Cubierta
                </Button>
                {selectedCells.length > 0 && (
                     <MultiCellEditor
                        cells={selectedCells}
                        onCellChange={handleMultiCellChange}
                        category={category}
                    />
                )}
            </div>

            <div className="md:col-span-2 overflow-y-auto space-y-4 pr-2">
                 {Object.entries(layout.floors).map(([floorKey, floor]) => {
                    const grid = unflattenGrid(floor.grid.gridData, floor.grid.cols);

                    if (!Array.isArray(grid) || !grid.every(row => Array.isArray(row))) {
                        return <div key={floorKey} className="text-destructive">Error: Formato de grilla inválido.</div>;
                    }

                    return (
                    <div key={floorKey} className="p-4 border rounded-lg space-y-4">
                        <div className="flex items-center justify-between">
                             <Input 
                                value={floor.name}
                                onChange={(e) => setLayout(prev => {
                                    const newLayout = {...prev};
                                    newLayout.floors[floorKey].name = e.target.value;
                                    return newLayout;
                                })}
                                className="text-lg font-bold w-1/2"
                             />
                             {Object.keys(layout.floors).length > 1 && (
                                <Button variant="ghost" size="icon" onClick={() => removeFloor(floorKey)}>
                                    <Trash2 className="w-4 h-4 text-destructive"/>
                                </Button>
                             )}
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="space-y-1">
                                <Label>Filas</Label>
                                <Input type="number" value={gridDimensions[floorKey]?.rows} onChange={e => updateGridDimensions(floorKey, 'rows', e.target.value)} min="1"/>
                            </div>
                            <div className="space-y-1">
                                <Label>Columnas</Label>
                                <Input type="number" value={gridDimensions[floorKey]?.cols} onChange={e => updateGridDimensions(floorKey, 'cols', e.target.value)} min="1"/>
                            </div>
                        </div>
                        <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${grid[0]?.length || 1}, minmax(0, 4rem))`}}>
                            {grid.map((row, rowIndex) => (
                                row.map((cell, colIndex) => {
                                    const cellKey = `${floorKey}-${rowIndex}-${colIndex}`;
                                    const isSelected = selectedCells.some(c => c.floorKey === floorKey && c.row === rowIndex && c.col === colIndex);

                                    let cellContent;

                                    if (cell.type === 'seat') {
                                        cellContent = <div className="flex flex-col items-center"><Armchair className="w-4 h-4"/><span className="font-bold">{cell.number || '?'}</span></div>;
                                    } else if (cell.type === 'cabin') {
                                        cellContent = <div className="flex flex-col items-center"><BedDouble className="w-4 h-4"/><span className="font-bold truncate">{cell.number || '?'}</span></div>;
                                    } else {
                                        cellContent = <SpecialCell type={cell.type} />;
                                    }

                                    return (
                                        <button 
                                            key={cellKey}
                                            onClick={(e) => handleCellClick(e, floorKey, rowIndex, colIndex)}
                                            className={cn(
                                                'w-full aspect-square text-xs border flex items-center justify-center',
                                                isSelected ? 'ring-2 ring-primary border-primary' : 'border-dashed'
                                            )}
                                        >
                                            {cellContent}
                                        </button>
                                    )
                                })
                            ))}
                        </div>
                    </div>
                 )})}
            </div>
        </div>

        <DialogFooter className="mt-auto pt-4 border-t">
          <DialogClose asChild>
            <Button variant="outline">Cancelar</Button>
          </DialogClose>
          <Button onClick={handleSaveClick}>Guardar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
