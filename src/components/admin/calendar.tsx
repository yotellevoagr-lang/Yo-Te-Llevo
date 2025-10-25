
"use client";

import { useCalendarBubbles } from "@/hooks/use-calendar-bubbles";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Printer,
  FileDown,
  Expand,
  Trash2,
  ListPlus,
  PlusCircle,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Switch } from "../ui/switch";
import { Label } from "../ui/label";
import type { Bubble } from "@/hooks/use-calendar-bubbles";
import { toPng } from "html-to-image";
import jsPDF from "jspdf";
import { useMemo, useEffect } from "react";

const monthNames = [ "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre" ];

const tailwindToHex: Record<string, { bg: string; border: string }> = {
  "bg-blue-200 border-blue-400": { bg: "#BFDBFE", border: "#60A5FA" },
  "bg-green-200 border-green-400": { bg: "#BBF7D0", border: "#4ADE80" },
  "bg-yellow-200 border-yellow-400": { bg: "#FEF08A", border: "#FACC15" },
  "bg-red-200 border-red-400": { bg: "#FECACA", border: "#F87171" },
  "bg-purple-200 border-purple-400": { bg: "#E9D5FF", border: "#A78BFA" },
  "bg-pink-200 border-pink-400": { bg: "#FBCFE8", border: "#F472B6" },
};

interface CalendarProps {
  onDateChange?: (year: number) => void;
}

export function Calendar({ onDateChange }: CalendarProps) {
  const {
    currentDate,
    setCurrentDate,
    days,
    weekdays,
    bubbles,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    isSelecting,
    handleBubbleChange,
    handleExpandBubble,
    handleDeleteBubble,
    handleColorChange,
    multiSelectMode,
    setMultiSelectMode,
    handleMultiSelectDayClick,
    createBubbleFromMultiSelect,
    calendarRef,
  } = useCalendarBubbles();
  
  useEffect(() => {
    onDateChange?.(currentDate.getFullYear());
  }, [currentDate, onDateChange]);

  const handlePrint = async () => {
    if (!calendarRef.current) return;

    try {
      const dataUrl = await toPng(calendarRef.current, { 
          quality: 1.0, 
          pixelRatio: 3,
      });
      
      const pdf = new jsPDF({
          orientation: "landscape",
          unit: "mm",
          format: "a4"
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      pdf.addImage(dataUrl, 'PNG', 0, 0, pdfWidth, pdfHeight);
      
      pdf.autoPrint();
      window.open(pdf.output('bloburl'), '_blank');

    } catch (error) {
      console.error('oops, something went wrong!', error);
    }
  };

  const handleMonthChange = (monthIndex: string) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(parseInt(monthIndex));
    setCurrentDate(newDate);
  }

  const handleYearChange = (year: string) => {
    const newDate = new Date(currentDate);
    newDate.setFullYear(parseInt(year));
    setCurrentDate(newDate);
  }

  const currentYear = currentDate.getFullYear();
  const years = Array.from({ length: 10 }, (_, i) => currentYear - 5 + i);

  const colors = Object.keys(tailwindToHex);

 const bubbleSegments = useMemo(() => {
    const segments: { bubble: Bubble; startCol: number; colSpan: number; row: number; isFirstSegment: boolean; track: number }[] = [];
    if (!days || days.length === 0) return segments;

    const gridStartDate = new Date(days[0].date);
    const dayTracks: Record<string, number[]> = {};

    bubbles.forEach(bubble => {
      const sortedDates = bubble.dates.map(d => new Date(d + 'T00:00:00')).sort((a, b) => a.getTime() - b.getTime());
      if (sortedDates.length === 0) return;

      let isFirstSegment = true;
      let currentSegment: Date[] = [];
      
      const commitSegment = () => {
          if (currentSegment.length === 0) return;

          const segmentStartDate = currentSegment[0];
          const segmentStartDateStr = segmentStartDate.toISOString().split('T')[0];

          if (!dayTracks[segmentStartDateStr]) dayTracks[segmentStartDateStr] = [];

          let track = 1;
          while (dayTracks[segmentStartDateStr].includes(track)) {
              track++;
          }
          
          dayTracks[segmentStartDateStr].push(track);
          currentSegment.slice(1).forEach(d => {
              const dStr = d.toISOString().split('T')[0];
              if (!dayTracks[dStr]) dayTracks[dStr] = [];
              dayTracks[dStr].push(track);
          });
          
          const timeDiff = segmentStartDate.getTime() - gridStartDate.getTime();
          const dayDiff = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
          const row = Math.floor(dayDiff / 7);
          const startCol = segmentStartDate.getDay();
          
          segments.push({
            bubble,
            startCol: startCol + 1,
            colSpan: currentSegment.length,
            row: row + 1,
            isFirstSegment,
            track
          });
          if (isFirstSegment) isFirstSegment = false;
      }


      for (let i = 0; i < sortedDates.length; i++) {
        const date = sortedDates[i];
        const prevDate = i > 0 ? sortedDates[i - 1] : null;

        if (prevDate && (date.getTime() - prevDate.getTime() <= 86400000) && date.getDay() !== 0) {
          currentSegment.push(date);
        } else {
          commitSegment();
          currentSegment = [date];
        }
      }
      commitSegment();
    });

    return segments;
  }, [bubbles, days]);
  
  return (
    <div className="bg-card p-4 rounded-lg shadow-sm">
      <div className="flex justify-between items-center mb-4 no-print">
        <div className="flex items-center gap-4">
           <Select value={String(currentDate.getMonth())} onValueChange={handleMonthChange}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Mes" />
              </SelectTrigger>
              <SelectContent>
                {monthNames.map((name, index) => (
                  <SelectItem key={name} value={String(index)}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
             <Select value={String(currentYear)} onValueChange={handleYearChange}>
              <SelectTrigger className="w-[100px]">
                <SelectValue placeholder="Año" />
              </SelectTrigger>
              <SelectContent>
                {years.map(year => (
                  <SelectItem key={year} value={String(year)}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
             <div className="flex items-center space-x-2">
                <Switch
                    id="multi-select-mode"
                    checked={multiSelectMode}
                    onCheckedChange={setMultiSelectMode}
                />
                <Label htmlFor="multi-select-mode" className="flex items-center gap-2"><ListPlus className="w-4 h-4" /> Selección Múltiple</Label>
            </div>
            {multiSelectMode && (
                <Button onClick={createBubbleFromMultiSelect}>
                    <PlusCircle className="w-4 h-4 mr-2" /> Crear Burbuja
                </Button>
            )}
        </div>
        <div className="flex items-center gap-2 no-print">
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" />
            Imprimir Mes
          </Button>
        </div>
      </div>

      <div className="printable-calendar" ref={calendarRef}>
         <div className="calendar-header-month text-center font-bold">
          {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
        </div>
        <div className="calendar-header-days">
            {weekdays.map((day) => (
            <div key={day} className="text-center font-bold">
                {day}
            </div>
            ))}
        </div>
        <div className="calendar-grid">
            {days.map(({ date, isCurrentMonth, isToday, selectionInfo }) => {
                const dayKey = date.toISOString().split("T")[0];
                const isSelectedForMulti = selectionInfo?.isMultiSelecting;
                
                return (
                <div
                    key={dayKey}
                    data-date={dayKey}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={isSelecting ? handleMouseUp : undefined}
                    onClick={multiSelectMode ? () => handleMultiSelectDayClick(dayKey) : undefined}
                    className={cn(
                    "calendar-day-cell",
                    !isCurrentMonth && "bg-muted/50 text-muted-foreground",
                    selectionInfo?.isSelecting && !multiSelectMode && "bg-primary/20",
                    isSelectedForMulti && multiSelectMode && "bg-primary/30 ring-2 ring-primary inset-0",
                    multiSelectMode && "cursor-pointer"
                    )}
                >
                    <div className="calendar-day-number">
                        <span
                        className={cn(
                            "flex items-center justify-center w-6 h-6 rounded-full text-sm",
                            isToday && "bg-primary text-primary-foreground"
                        )}
                        >
                        {date.getDate()}
                        </span>
                    </div>
                </div>
                );
            })}
             <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-10 grid grid-cols-7 grid-rows-6">
                {bubbleSegments.map(({ bubble, startCol, colSpan, row, isFirstSegment, track }) => (
                    <div
                        key={`${bubble.id}-segment-${row}-${startCol}`}
                        className={cn("calendar-bubble relative group pointer-events-auto", bubble.color)}
                        style={{
                            gridColumnStart: startCol,
                            gridColumnEnd: `span ${colSpan}`,
                            gridRowStart: row,
                            height: `${bubble.height || 28}px`,
                            alignSelf: 'start',
                            marginTop: `${2 + (track - 1) * 30}px`,
                        }}
                        onMouseDown={(e) => e.stopPropagation()} 
                    >
                        {isFirstSegment && (
                            <>
                                <textarea
                                    value={bubble.text}
                                    onChange={(e) => handleBubbleChange(bubble.id, e.target.value)}
                                    className="text-black"
                                    placeholder="Escribe aquí..."
                                />
                                <div className="absolute bottom-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity no-print z-20">
                                <Popover>
                                    <PopoverTrigger asChild>
                                    <Button size="icon" variant="ghost" className="h-5 w-5 rounded-full" onClick={e => e.stopPropagation()}>
                                        <div className={cn("w-3 h-3 rounded-full", bubble.color)}></div>
                                    </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-2">
                                    <div className="flex gap-1">
                                        {colors.map(color => (
                                        <Button key={color} size="icon" variant="ghost" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); handleColorChange(bubble.id, color); }}>
                                            <div className={cn("w-4 h-4 rounded-full", color)}></div>
                                        </Button>
                                        ))}
                                    </div>
                                    </PopoverContent>
                                </Popover>
                                <Button size="icon" variant="ghost" className="h-5 w-5 text-black/50 hover:text-black" onClick={(e) => { e.stopPropagation(); handleExpandBubble(bubble.id); }}>
                                    <Expand className="w-3 h-3" />
                                </Button>
                                <Button size="icon" variant="ghost" className="h-5 w-5 text-red-500/50 hover:text-red-500" onClick={(e) => { e.stopPropagation(); handleDeleteBubble(bubble.id); }}>
                                    <Trash2 className="w-3 h-3" />
                                </Button>
                                </div>
                            </>
                        )}
                    </div>
                ))}
            </div>
        </div>
      </div>
    </div>
  );
}
