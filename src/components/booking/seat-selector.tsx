

"use client"

import { cn } from "@/lib/utils"
import { LayoutItemType, LayoutCategory } from "@/lib/types"
import { getLayoutForType, Cell, Layout } from "@/lib/layouts"
import { Armchair, ShieldIcon, PersonStanding, Waves, PersonStandingIcon, BusIcon, ChefHatIcon, BedDouble, Anchor, Loader2 } from "lucide-react"
import { useEffect, useState } from "react"

interface SeatSelectorProps {
  category: LayoutCategory;
  layoutType: LayoutItemType;
  occupiedSeats: string[];
  occupiedCabins: string[];
  selectedSeats: string[];
  selectedCabins: string[];
  onAssignment: (id: string, type: 'seat' | 'cabin') => void;
  maxAssignments: number;
}

const unflattenGrid = (gridData: Cell[], cols: number): Cell[][] => {
    if (!cols || cols === 0) return [];
    const newGrid: Cell[][] = [];
    for (let i = 0; i < gridData.length; i += cols) {
        newGrid.push(gridData.slice(i, i + cols));
    }
    return newGrid;
};

const SpecialCell = ({ type }: { type: Cell['type'] }) => {
    let content = null;
    const className = "text-muted-foreground/60 flex flex-col items-center justify-center text-center text-[9px] leading-tight font-medium h-full w-full rounded-md bg-muted/30";
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

export function SeatSelector({
  category,
  layoutType,
  occupiedSeats,
  occupiedCabins,
  selectedSeats,
  selectedCabins,
  onAssignment,
  maxAssignments,
}: SeatSelectorProps) {
    const [layout, setLayout] = useState<Layout | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!layoutType || !category) return;
        
        setIsLoading(true);
        const fetchLayout = async () => {
            const layoutData = await getLayoutForType(category, layoutType);
            setLayout(layoutData);
            setIsLoading(false);
        }
        fetchLayout();
    }, [category, layoutType]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-48">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        )
    }

    if (!layout) return <div className="text-center text-muted-foreground p-4">No se encontró el layout para este transporte.</div>;
    
    const floorsArray = Object.values(layout.floors);

    const handleAssignmentClick = (id: string, type: 'seat' | 'cabin') => {
        const totalSelected = selectedSeats.length + selectedCabins.length;
        const isSelected = type === 'seat' ? selectedSeats.includes(id) : selectedCabins.includes(id);

        if (isSelected) {
            onAssignment(id, type); 
        } else if (totalSelected < maxAssignments) {
            onAssignment(id, type);
        }
    }

  return (
    <div className="p-1 border rounded-lg bg-card md:p-2">
        {floorsArray.map((floor, floorIndex) => {
            const grid = unflattenGrid(floor.grid.gridData, floor.grid.cols);
            if(grid.length === 0) return null;

            return (
            <div key={floorIndex}>
                {floorsArray.length > 1 && (
                    <h3 className="mt-4 mb-2 text-lg font-bold text-center first:mt-0">
                        {floor.name}
                    </h3>
                )}
                 <div className="flex justify-center mb-4">
                    <div className="w-48 p-2 text-center border-2 border-dashed rounded-md border-muted-foreground text-muted-foreground">
                        Frente
                    </div>
                </div>

                <div className="grid justify-center" style={{ gridTemplateColumns: `repeat(${grid[0]?.length || 1}, minmax(0, 1fr))` }}>
                    {grid.map((row, rowIndex) => (
                        row.map((cell, cellIndex) => {
                            const key = `${floorIndex}-${rowIndex}-${cellIndex}`;
                            
                            if (cell.type !== 'seat' && cell.type !== 'cabin') {
                                return (
                                    <div key={key} className="flex items-center justify-center w-10 h-10 p-1 md:w-12 md:h-12">
                                       <SpecialCell type={cell.type} />
                                    </div>
                                )
                            }
                           
                            const isSeat = cell.type === 'seat';
                            const id = isSeat ? String(cell.number) : String(cell.number);
                            const isOccupied = isSeat ? occupiedSeats.includes(id) : occupiedCabins.includes(id);
                            const isSelected = isSeat ? selectedSeats.includes(String(id)) : selectedCabins.includes(String(id));
                            const isDisabled = isOccupied;
                            const Icon = isSeat ? Armchair : BedDouble;
                            const text = isSeat ? String(cell.number) : cell.number;

                            return (
                                <div key={key} className="flex items-center justify-center w-10 h-10 p-1 md:w-12 md:h-12">
                                    <button
                                        onClick={() => handleAssignmentClick(id, cell.type as 'seat'|'cabin')}
                                        disabled={isDisabled}
                                        className={cn(
                                        "relative flex items-center justify-center w-full h-full rounded-md transition-colors font-mono",
                                        isDisabled ? "bg-destructive/50 text-destructive-foreground/70 cursor-not-allowed" :
                                        isSelected ? "bg-primary text-primary-foreground ring-2 ring-offset-2 ring-primary" :
                                        "bg-secondary hover:bg-primary/20",
                                        "text-xs"
                                        )}
                                    >
                                        <Icon className="w-4 h-4 md:w-5 md:h-5 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-20" />
                                        <span className="relative font-bold">{text}</span>
                                    </button>
                                </div>
                            )
                        })
                    ))}
                </div>
            </div>
        )})}
     
       <div className="flex flex-wrap justify-center gap-4 mt-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-sm bg-secondary border"></div>
          <span>Disponible</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-sm bg-primary"></div>
          <span>Seleccionado</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-sm bg-destructive/50"></div>
          <span>Ocupado</span>
        </div>
      </div>
    </div>
  )
}
