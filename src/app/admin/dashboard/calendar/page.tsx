
"use client"

import { useState } from 'react';
import { Calendar } from '@/components/admin/calendar';
import { Button } from '@/components/ui/button';
import { BookMarked, AlertCircle, FileDown, Loader2, Printer } from 'lucide-react';
import { HistoryViewer } from '@/components/admin/history-viewer';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { YearlyCalendarExporter } from '@/components/admin/yearly-calendar-exporter';

type ExportOptions = {
    includeData: boolean;
    year: number;
} | null;

export default function CalendarPage() {
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [hasDueItems, setHasDueItems] = useState(false); 
  const [exportOptions, setExportOptions] = useState<ExportOptions>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [currentYearForExport, setCurrentYearForExport] = useState(new Date().getFullYear());

  const handleExport = (includeData: boolean) => {
    setIsExporting(true);
    setExportOptions({ includeData, year: currentYearForExport });
  };

  const handleExportComplete = () => {
    setIsExporting(false);
    setExportOptions(null);
  };
  
  const handlePrintCurrentMonth = () => {
    window.print();
  }

  return (
    <>
      <HistoryViewer 
        isOpen={isHistoryOpen} 
        onOpenChange={setIsHistoryOpen} 
        historyKey="ytl_calendar_history"
        title="Historial de Calendarios"
        setHasDueItems={setHasDueItems}
      />

      {exportOptions && (
        <YearlyCalendarExporter 
            year={exportOptions.year}
            includeData={exportOptions.includeData}
            onComplete={handleExportComplete}
        />
      )}

      <div className="printable-area">
        <div className="no-print flex justify-between items-center mb-4">
          <div>
            <h2 className="text-2xl font-bold">Calendario de Anotaciones</h2>
            <p className="text-muted-foreground">
              Organiza tus eventos y notas directamente en el calendario. Haz clic en un día, arrastra para crear un rango o usa la selección múltiple.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handlePrintCurrentMonth}>
                <Printer className="mr-2 h-4 w-4" />
                Imprimir Mes Actual
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" disabled={isExporting}>
                    {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <FileDown className="mr-2 h-4 w-4" />}
                    {isExporting ? 'Exportando...' : 'Exportar Año'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => handleExport(true)}>Descargar Año (con datos)</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport(false)}>Descargar Año (vacío)</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button variant="outline" onClick={() => setIsHistoryOpen(true)}>
              {hasDueItems && <AlertCircle className="mr-2 h-4 w-4 text-destructive" />}
              <BookMarked className="mr-2 h-4 w-4" />
              Historial de Calendarios
            </Button>
          </div>
        </div>
        <Calendar onDateChange={setCurrentYearForExport}/>
      </div>
    </>
  );
}
