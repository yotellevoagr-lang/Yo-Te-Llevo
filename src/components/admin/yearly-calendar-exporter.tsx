
"use client";

import { useState, useEffect, useCallback } from 'react';
import jsPDF from 'jspdf';
import { toPng } from 'html-to-image';
import { cn } from "@/lib/utils";
import type { Bubble } from "@/hooks/use-calendar-bubbles";
import { getDocumentById } from '@/lib/firestore-services';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface YearlyCalendarExporterProps {
    year: number;
    includeData: boolean;
    onComplete: () => void;
}

const monthNames = [ "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre" ];
const weekdays = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

const getDaysForMonth = (year: number, month: number) => {
    const firstDayOfMonth = new Date(year, month, 1);
    const startDate = new Date(firstDayOfMonth);
    startDate.setDate(startDate.getDate() - startDate.getDay());

    const days = [];
    for (let i = 0; i < 42; i++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + i);
        days.push({
            date,
            isCurrentMonth: date.getMonth() === month,
        });
    }
    return days;
};

const getBubbleSegments = (bubbles: Bubble[], days: { date: Date; isCurrentMonth: boolean }[]) => {
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
            while (dayTracks[segmentStartDateStr].includes(track)) track++;
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
            segments.push({ bubble, startCol: startCol + 1, colSpan: currentSegment.length, row: row + 1, isFirstSegment, track });
            if (isFirstSegment) isFirstSegment = false;
        };

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
};

const MonthCalendar = ({ year, month, bubbles }: { year: number, month: number, bubbles: Bubble[] }) => {
    const days = getDaysForMonth(year, month);
    const bubbleSegments = getBubbleSegments(bubbles, days);
    
    return (
        <div id={`calendar-month-${month}`} className="printable-calendar bg-white">
            <div className="calendar-header-month text-center font-bold">{monthNames[month]} {year}</div>
            <div className="calendar-header-days">{weekdays.map((day) => (<div key={day} className="text-center font-bold">{day}</div>))}</div>
            <div className="calendar-grid">
                {days.map(({ date, isCurrentMonth }) => (
                    <div key={date.toISOString()} className={cn("calendar-day-cell", !isCurrentMonth && "bg-slate-100 text-slate-400")}>
                        <div className="calendar-day-number">
                            <span className="flex items-center justify-center w-6 h-6 rounded-full text-sm">{date.getDate()}</span>
                        </div>
                    </div>
                ))}
                <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-10 grid grid-cols-7 grid-rows-6">
                    {bubbleSegments.map(({ bubble, startCol, colSpan, row, isFirstSegment, track }) => (
                        <div key={`${bubble.id}-segment-${row}-${startCol}`} className={cn("calendar-bubble relative", bubble.color)} style={{ gridColumnStart: startCol, gridColumnEnd: `span ${colSpan}`, gridRowStart: row, height: `${bubble.height || 28}px`, alignSelf: 'start', marginTop: `${2 + (track - 1) * 30}px` }}>
                            {isFirstSegment && <div className="text-black px-1">{bubble.text}</div>}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export function YearlyCalendarExporter({ year, includeData, onComplete }: YearlyCalendarExporterProps) {
    const { toast } = useToast();
    const [allBubbles, setAllBubbles] = useState<Bubble[]>([]);
    const [isPreparing, setIsPreparing] = useState(true);

    const generatePdf = useCallback(async () => {
        const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
        const container = document.getElementById("pdf-container");
        if (!container) return;

        // Make container visible but off-screen to ensure rendering
        container.style.position = 'absolute';
        container.style.left = '-9999px';
        container.style.top = 'auto';
        container.style.visibility = 'visible';

        for (let month = 0; month < 12; month++) {
            await new Promise(resolve => requestAnimationFrame(resolve));
            
            const monthElement = document.getElementById(`calendar-month-${month}`);
            if (!monthElement) continue;

            try {
                const dataUrl = await toPng(monthElement, { quality: 1.0, pixelRatio: 2.5 });
                
                if (month > 0) pdf.addPage();
                
                const pdfWidth = pdf.internal.pageSize.getWidth();
                const pdfHeight = pdf.internal.pageSize.getHeight();
                pdf.addImage(dataUrl, 'PNG', 0, 0, pdfWidth, pdfHeight);

            } catch(error) {
                console.error(`Error generating page for month ${month}:`, error);
                toast({
                    title: "Error de Exportación",
                    description: `No se pudo generar la página para ${monthNames[month]}. El PDF puede estar incompleto.`,
                    variant: "destructive"
                });
                // Stop the process if one month fails
                onComplete();
                return;
            }
        }
        
        pdf.save(`Calendarios_${year}_${includeData ? 'con_datos' : 'vacio'}.pdf`);
        onComplete();
    }, [year, includeData, onComplete, toast]);

    useEffect(() => {
        const fetchAndGenerate = async () => {
            setIsPreparing(true);
            let bubbles: Bubble[] = [];
            if (includeData) {
                const savedData = await getDocumentById<{ bubbles: Bubble[] }>('settings', 'calendarBubbles');
                if (savedData) bubbles = savedData.bubbles;
            }
            setAllBubbles(bubbles);
            setIsPreparing(false);
        };
        fetchAndGenerate();
    }, [year, includeData]);

    useEffect(() => {
        if (!isPreparing) {
            // Use a timeout to ensure React has finished rendering the bubbles
            const timer = setTimeout(() => {
                generatePdf();
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [isPreparing, generatePdf]);

    return (
        <>
            <div id="pdf-container" style={{ visibility: 'hidden', height: 0, overflow: 'hidden' }}>
                {Array.from({ length: 12 }).map((_, monthIndex) => (
                    <MonthCalendar key={monthIndex} year={year} month={monthIndex} bubbles={allBubbles} />
                ))}
            </div>
             {isPreparing && (
                <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center">
                    <div className="bg-background p-6 rounded-lg shadow-xl flex items-center gap-4">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                        <span className="font-semibold text-lg">Preparando datos...</span>
                    </div>
                </div>
            )}
        </>
    );
}
