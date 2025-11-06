
"use client"

import { useState } from "react"
import * as XLSX from "xlsx"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { Alert, AlertDescription, AlertTitle } from "../ui/alert"
import { Loader2, FileUp, Info, CheckCircle, Search, TableIcon, Users, Building } from "lucide-react"
import { ScrollArea } from "../ui/scroll-area"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table"
import { toTitleCase } from "@/lib/utils"

interface TemplateAnalyzerProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

type AnalysisResult = {
  tripName: string;
  headers: Record<string, number>;
  passengerDataSample: any[][];
  sellerNames: string[];
  roomingTypes: string[];
  pensionTypes: string[];
  boardingPointsRaw: string[];
} | null;

const spanishMonths = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

const cleanTripName = (fileName: string): string => {
    let cleanedName = fileName.replace(/\.[^/.]+$/, "");
    const monthRegex = new RegExp(`\\b(${spanishMonths.join('|')})\\b`, 'gi');
    cleanedName = cleanedName.replace(monthRegex, '');
    cleanedName = cleanedName.replace(/\b\d{1,2}[\s\-/]\d{1,2}\b/g, ''); 
    cleanedName = cleanedName.replace(/\b\d{1,4}\b/g, ''); 
    cleanedName = cleanedName.replace(/[\-_]/g, ' '); 
    cleanedName = cleanedName.replace(/\s+/g, ' ').trim(); 
    return toTitleCase(cleanedName);
}

export function TemplateAnalyzer({ isOpen, onOpenChange }: TemplateAnalyzerProps) {
    const { toast } = useToast();
    const [file, setFile] = useState<File | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<AnalysisResult>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setFile(e.target.files[0]);
            setAnalysisResult(null);
        }
    }

    const handleAnalyze = async () => {
        if (!file) {
            toast({ title: "No se seleccionó ningún archivo", variant: "destructive" });
            return;
        }
        setIsLoading(true);
        setAnalysisResult(null);

        try {
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data, { cellStyles: true, cellDates: true });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];

            const tripName = cleanTripName(file.name);
            const headers: string[] = (XLSX.utils.sheet_to_json(worksheet, { header: 1, range: "A6:AH6" })[0] as string[]).map(h => h ? String(h).toUpperCase().trim() : '');
            const colMap: Record<string, number> = headers.reduce((acc, header, index) => {
                if (header) acc[header] = index;
                return acc;
            }, {} as Record<string, number>);

            const passengerDataSample: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, range: "A7:AH12" });
            const sellerNames: string[] = (XLSX.utils.sheet_to_json(worksheet, { header: 1, range: "AW193:AW236" }) as string[][]).flat().filter(Boolean);
            const roomingTypes: string[] = (XLSX.utils.sheet_to_json(worksheet, { header: 1, range: "AW240:AW258" }) as string[][]).flat().filter(Boolean);
            const pensionTypes: string[] = (XLSX.utils.sheet_to_json(worksheet, { header: 1, range: "AX179:AX181" }) as string[][]).flat().filter(Boolean);
            const boardingPointsRaw: string[] = (XLSX.utils.sheet_to_json(worksheet, { header: 1, range: "AW261:AW298" }) as string[][]).flat().filter(Boolean);

            setAnalysisResult({
                tripName,
                headers: colMap,
                passengerDataSample,
                sellerNames,
                roomingTypes,
                pensionTypes,
                boardingPointsRaw
            });

        } catch (error) {
            console.error("Error analizando el archivo:", error);
            toast({ title: "Error de Análisis", description: `No se pudo leer el archivo. Asegúrate de que el formato sea correcto.`, variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    }
    
    const renderResult = () => {
        if (!analysisResult) return null;
        
        return (
            <div className="space-y-4">
                <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertTitle>Análisis Completado</AlertTitle>
                    <AlertDescription>
                        <p>Nombre del viaje detectado: <span className="font-semibold text-primary">{analysisResult.tripName}</span></p>
                    </AlertDescription>
                </Alert>
                
                <div className="space-y-2">
                    <h4 className="font-semibold flex items-center gap-2"><TableIcon className="w-4 h-4"/> Cabeceras de Columna Encontradas</h4>
                    <pre className="text-xs bg-muted p-2 rounded-md overflow-x-auto">{JSON.stringify(analysisResult.headers, null, 2)}</pre>
                </div>
                
                <div className="space-y-2">
                    <h4 className="font-semibold flex items-center gap-2"><Users className="w-4 h-4"/> Muestra de Datos de Pasajeros (primeras 5 filas)</h4>
                    <div className="border rounded-md overflow-x-auto">
                        <Table className="min-w-max">
                            <TableHeader><TableRow>{Object.keys(analysisResult.headers).map(h => <TableHead key={h} className="text-xs p-1 whitespace-nowrap">{h}</TableHead>)}</TableRow></TableHeader>
                            <TableBody>
                                {analysisResult.passengerDataSample.map((row, i) => (
                                    <TableRow key={i}>{Object.values(analysisResult.headers).map(colIdx => <TableCell key={colIdx} className="text-xs p-1 whitespace-nowrap">{row[colIdx]}</TableCell>)}</TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </div>
                
                 <div className="space-y-2">
                    <h4 className="font-semibold flex items-center gap-2"><Building className="w-4 h-4"/> Datos de Listas Encontradas</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                        <div className="p-2 bg-muted rounded-md space-y-1">
                            <p className="font-bold">Vendedores:</p>
                            <p>{analysisResult.sellerNames.join(', ') || 'Ninguno'}</p>
                        </div>
                        <div className="p-2 bg-muted rounded-md space-y-1">
                            <p className="font-bold">Tipos de Habitación:</p>
                            <p>{analysisResult.roomingTypes.join(', ') || 'Ninguno'}</p>
                        </div>
                         <div className="p-2 bg-muted rounded-md space-y-1">
                            <p className="font-bold">Tipos de Pensión:</p>
                            <p>{analysisResult.pensionTypes.join(', ') || 'Ninguno'}</p>
                        </div>
                         <div className="p-2 bg-muted rounded-md space-y-1">
                            <p className="font-bold">Puntos de Embarque:</p>
                            <p>{analysisResult.boardingPointsRaw.join(', ') || 'Ninguno'}</p>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl flex flex-col h-[90vh]">
                <DialogHeader>
                    <DialogTitle>Analizador de Plantilla Excel</DialogTitle>
                    <DialogDescription>
                       Sube un archivo Excel para ver cómo lo interpreta el sistema y detectar posibles errores de formato.
                    </DialogDescription>
                </DialogHeader>
                 <div className="flex-1 flex flex-col gap-4 overflow-hidden">
                    <div className="space-y-2">
                        <Label htmlFor="template-file-analyzer">Archivo Excel</Label>
                        <div className="flex gap-2">
                            <Input id="template-file-analyzer" type="file" onChange={handleFileChange} accept=".xlsx, .xls" />
                             <Button onClick={handleAnalyze} disabled={!file || isLoading} className="w-48">
                                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                                {isLoading ? "Analizando..." : "Analizar"}
                            </Button>
                        </div>
                    </div>
                    <ScrollArea className="border rounded-md p-4 bg-background flex-1">
                        {analysisResult ? renderResult() : (
                            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                                <FileUp className="w-12 h-12 mb-4"/>
                                <p>Sube un archivo y presiona "Analizar" para ver los resultados.</p>
                            </div>
                        )}
                    </ScrollArea>
                 </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cerrar</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
