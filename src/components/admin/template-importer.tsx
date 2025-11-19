
"use client"

import { useState, useMemo, useEffect } from "react"
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
import type { Tour, Passenger, Reservation, Seller, PricingTier, Installment, BoardingPoint, RoomType, PaymentMethod, Pension } from "@/lib/types"
import { Alert, AlertDescription, AlertTitle } from "../ui/alert"
import { CheckCircle, Loader2, UploadCloud, Calendar as CalendarIcon, Save } from "lucide-react"
import { DatePicker } from "../ui/date-picker"
import { getAllFromCollection, saveDocument, savePassenger, getDocumentById } from "@/lib/firestore-services"
import { toTitleCase } from "@/lib/utils"

interface TemplateImporterProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

type ImportResult = {
    newTours: number;
    newReservations: number;
    newPassengers: number;
    updatedPassengers: number;
    newBoardingPoints: number;
    newRoomTypes: number;
    newSellers: number;
    newPensions: number;
    createdTripId?: string;
    isNewTripFlow: boolean;
} | null;


const excelDateToJSDate = (serial: any): Date | undefined => {
    if (serial === undefined || serial === null || String(serial).trim() === "") return undefined;

    if (typeof serial === 'string') {
        const cleanedSerial = serial.replace(/[\/\.]/g, '-');
        const parts = cleanedSerial.split(/[\s-]/);
        if (parts.length >= 3) {
            let [day, month, year] = parts.map(p => p.trim());
            
            if (parseInt(day) > 12 && parseInt(month) <= 12) {
                 // Format is likely DD-MM-YYYY
            } else if (parseInt(month) > 12 && parseInt(day) <= 12) {
                 [day, month] = [month, day];
            } 

            if (year && year.length === 2) {
                year = (parseInt(year) > 50 ? '19' : '20') + year;
            }
            if (!isNaN(parseInt(day)) && !isNaN(parseInt(month)) && !isNaN(parseInt(year))) {
                const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                if (!isNaN(date.getTime())) {
                    return date;
                }
            }
        }
    }
    
    if (typeof serial === 'number' && serial > 0) {
        const utc_days  = Math.floor(serial - 25569);
        const utc_value = utc_days * 86400;                                        
        const date_info = new Date(utc_value * 1000);
        if(!isNaN(date_info.getTime())) {
             return new Date(date_info.getTime() + (date_info.getTimezoneOffset() * 60000));
        }
    }

    if (serial instanceof Date && !isNaN(serial.getTime())) {
        return serial;
    }

    return undefined;
}

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

const mapPaymentMethod = (methodChar: string): PaymentMethod | undefined => {
    const m = (methodChar || '').toUpperCase();
    if (m === 'TJ') return 'Tarjeta';
    if (m === 'TRN' || m === 'TR') return 'Transferencia';
    if (m === 'EF') return 'Efectivo';
    return undefined;
}


export function TemplateImporter({ isOpen, onOpenChange }: TemplateImporterProps) {
    const { toast } = useToast();
    const [file, setFile] = useState<File | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [importResult, setImportResult] = useState<ImportResult>(null);
    const [newTripDate, setNewTripDate] = useState<Date | undefined>();

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setFile(e.target.files[0]);
            setImportResult(null);
            setNewTripDate(undefined);
        }
    }
    
    useEffect(() => {
        if (!isOpen) {
            setFile(null);
            setImportResult(null);
            setNewTripDate(undefined);
            setIsLoading(false);
        }
    }, [isOpen]);

    const processAndSaveData = async (trip: Tour, worksheet: XLSX.WorkSheet) => {
        let resultCounts: ImportResult = { newTours: 0, newReservations: 0, newPassengers: 0, updatedPassengers: 0, newBoardingPoints: 0, newRoomTypes: 0, newSellers: 0, newPensions: 0, isNewTripFlow: false };
        
        const headers: string[] = (XLSX.utils.sheet_to_json(worksheet, { header: 1, range: "A6:AH6" })[0] as string[]).map(h => h ? String(h).toUpperCase().trim() : '');
        const colMap: Record<string, number> = headers.reduce((acc, header, index) => {
            if (header) acc[header] = index;
            return acc;
        }, {} as Record<string, number>);

        const passengerData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, range: "A7:AH67" });
        
        const sellerNames: string[] = (XLSX.utils.sheet_to_json(worksheet, { header: 1, range: "AW193:AW236" }) as string[][]).flat().filter(Boolean);
        const roomingTypes: string[] = (XLSX.utils.sheet_to_json(worksheet, { header: 1, range: "AW240:AW258" }) as string[][]).flat().filter(Boolean);
        const pensionTypes: string[] = (XLSX.utils.sheet_to_json(worksheet, { header: 1, range: "AX179:AX181" }) as string[][]).flat().filter(Boolean);
        const boardingPointsRaw: string[] = (XLSX.utils.sheet_to_json(worksheet, { header: 1, range: "AW261:AW298" }) as string[][]).flat().filter(Boolean);
        
        // --- GET CURRENT DATA FROM FIRESTORE ---
        let allPassengers: Passenger[] = await getAllFromCollection<Passenger>('passengers');
        let allBoardingPoints: BoardingPoint[] = await getAllFromCollection<BoardingPoint>('boarding_points');
        let allRoomTypes: RoomType[] = await getAllFromCollection<RoomType>('room_types');
        let allSellers: Seller[] = await getAllFromCollection<Seller>('sellers');
        let allPensions: Pension[] = await getAllFromCollection<Pension>('pensions');
        
        for (const name of sellerNames) {
            const cleanName = toTitleCase(name);
            if (cleanName && !allSellers.some(s => toTitleCase(s.name) === cleanName)) {
                const newSeller = { name: cleanName, useFixedCommission: false, dni: '', phone: '' };
                const newId = await saveDocument('sellers', newSeller);
                allSellers.push({ id: newId, ...newSeller });
                resultCounts.newSellers++;
            }
        }
        for (const name of roomingTypes) {
             const cleanName = toTitleCase(name);
            if (cleanName && !allRoomTypes.some(rt => toTitleCase(rt.name) === cleanName)) {
                const newRoomType = { name: cleanName };
                const newId = await saveDocument('room_types', newRoomType);
                allRoomTypes.push({ id: newId, ...newRoomType });
                resultCounts.newRoomTypes++;
            }
        }
         for (const name of pensionTypes) {
             const cleanName = toTitleCase(name);
            if (cleanName && !allPensions.some(p => toTitleCase(p.name) === cleanName)) {
                const newPension = { name: cleanName, description: "" };
                const newId = await saveDocument('pensions', newPension);
                allPensions.push({ id: newId, ...newPension });
                resultCounts.newPensions++;
            }
        }
        for (const name of boardingPointsRaw) {
            const match = String(name).match(/^([A-Z])-([\s\S]+)$/i);
            if (match) {
                const bpId = match[1].toUpperCase();
                const bpName = toTitleCase(match[2].trim());
                if (!allBoardingPoints.some(bp => bp.id === bpId)) {
                    const newBp = { id: bpId, name: bpName };
                    await saveDocument('boarding_points', newBp, bpId);
                    allBoardingPoints.push(newBp);
                    resultCounts.newBoardingPoints++;
                }
            } else {
                 const cleanName = toTitleCase(name);
                 if (cleanName && !allBoardingPoints.some(bp => toTitleCase(bp.name) === cleanName)) {
                    const newBp = { name: cleanName };
                    const newId = await saveDocument('boarding_points', newBp);
                    allBoardingPoints.push({ id: newId, ...newBp });
                    resultCounts.newBoardingPoints++;
                }
            }
        }

        const familyGroups = new Map<string, any[]>();
        for (const [rowIndex, row] of passengerData.entries()) {
            const passengerNameRaw = row[colMap['PASAJERO']];
            if (!passengerNameRaw || !String(passengerNameRaw).trim()) continue;
        
            const cellRef = XLSX.utils.encode_cell({ r: rowIndex + 6, c: colMap['PASAJERO'] }); 
            const cell = worksheet[cellRef];
            let familyColor = cell?.s?.fgColor?.rgb || 'no-color';
            if (familyColor === 'FFFFFFFF' || familyColor === '00000000' || !cell?.s?.fgColor) familyColor = `no-color-${rowIndex}`;
            
            if (!familyGroups.has(familyColor)) familyGroups.set(familyColor, []);
            familyGroups.get(familyColor)!.push(row);
        }
        
        const updatedPassengersMap = new Map<string, Passenger>();

        for (const groupRows of familyGroups.values()) {
            const processReservation = async (rowsForReservation: any[]) => {
                const mainPayerRow = rowsForReservation[0];
                if (!mainPayerRow) return;

                const reservationMembers: Passenger[] = [];
                for (const row of rowsForReservation) {
                    const passengerName = toTitleCase(row[colMap['PASAJERO']]);
                    const passengerDNI = String(row[colMap['DNI']] || '').replace(/\D/g, '');
                    if (!passengerName || !passengerDNI) continue;

                    let passenger = allPassengers.find(p => p.dni === passengerDNI) || updatedPassengersMap.get(passengerDNI);
                    const passengerExisted = !!passenger;
                    
                    const dobFromExcel = row[colMap['FECHA NAC']];
                    const dobValue = excelDateToJSDate(dobFromExcel);
                    
                    const boardingPointRaw = row[colMap['EMBARQUE']];
                    let boardingPointId: string | undefined = undefined;
                    if (boardingPointRaw) {
                        const bpMatch = String(boardingPointRaw).match(/^([A-Z])-?/i);
                        if (bpMatch) {
                            boardingPointId = bpMatch[1].toUpperCase();
                        } else {
                            const existingBp = allBoardingPoints.find(bp => toTitleCase(bp.name) === toTitleCase(boardingPointRaw));
                            if(existingBp) boardingPointId = existingBp.id;
                        }
                    }
                    
                    const phoneRaw = row[colMap['TELÉFONO O CELULAR']];
                    const phoneCleaned = phoneRaw && /^\d+$/.test(String(phoneRaw)) ? String(phoneRaw).replace(/\D/g, '') : null;

                    const passengerUpdate: Partial<Passenger> = {
                        fullName: passengerName,
                        dob: dobValue,
                        phone: phoneCleaned,
                        boardingPointId: boardingPointId,
                    };

                    if (passenger) {
                        const updatedPassenger = { ...passenger, ...passengerUpdate };
                        await savePassenger(updatedPassenger, passenger.id);
                        if (!updatedPassengersMap.has(passengerDNI)) resultCounts.updatedPassengers++;
                        passenger = updatedPassenger;
                    } else {
                        const newPassengerData = { dni: passengerDNI, nationality: "Argentina", ...passengerUpdate };
                        const newId = await savePassenger(newPassengerData);
                        passenger = { id: newId, ...newPassengerData } as Passenger;
                        resultCounts.newPassengers++;
                    }
                    updatedPassengersMap.set(passenger.dni, passenger);
                    reservationMembers.push(passenger);
                }

                if (reservationMembers.length === 0) return;

                const mainPayer = reservationMembers[0];
                const familyName = mainPayer.family || (mainPayer.lastName ? `Familia ${mainPayer.lastName}` : `Familia ${mainPayer.fullName.split(' ').pop()}`);

                for (const member of reservationMembers) {
                    if (!member.family) {
                        member.family = familyName;
                        await savePassenger({ family: familyName }, member.id);
                        updatedPassengersMap.set(member.dni, member);
                    }
                }
                
                const pricingTierSlots: string[] = [];
                let totalPaxCount = 0;
                let finalPrice = mainPayerRow[colMap['VALOR']] ? parseFloat(String(mainPayerRow[colMap['VALOR']])) || 0 : 0;
                
                const rowsWithQuantities = groupRows.filter(r => r[colMap['CANTIDAD']] && parseInt(String(r[colMap['CANTIDAD']])) > 0);
                
                if (rowsWithQuantities.length > 0) {
                     for (const row of rowsWithQuantities) {
                        const count = parseInt(String(row[colMap['CANTIDAD']]));
                        const tierName = toTitleCase(row[colMap['GRUPO ETARIO']] || 'adulto');
                        const tier = trip.pricingTiers?.find(t => toTitleCase(t.name) === tierName);
                        const tierId = tier?.id || 'adult';
                        for (let i = 0; i < count; i++) {
                            pricingTierSlots.push(tierId);
                        }
                        totalPaxCount += count;
                    }
                } else {
                    totalPaxCount = reservationMembers.length;
                    const defaultTier = trip.pricingTiers?.find(t => t.name.toLowerCase() === 'adulto')?.id || 'adult';
                    for (let i = 0; i < totalPaxCount; i++) pricingTierSlots.push(defaultTier);
                }
                
                reservationMembers.forEach((member, index) => {
                    member.tierId = pricingTierSlots[index] || 'adult';
                });

                if(finalPrice === 0) {
                    finalPrice = reservationMembers.reduce((sum, member) => {
                        const tier = trip.pricingTiers?.find(t => t.id === member.tierId);
                        return sum + (tier?.price ?? trip.price);
                    }, 0);
                }


                const installmentData = [
                    { amount: mainPayerRow[colMap['CUOTA 1']], method: mainPayerRow[colMap['M']] },
                    { amount: mainPayerRow[colMap['CUOTA 2']], method: mainPayerRow[colMap['M.1']] },
                    { amount: mainPayerRow[colMap['CUOTA 3']], method: mainPayerRow[colMap['M.2']] },
                    { amount: mainPayerRow[colMap['CUOTA 4']], method: mainPayerRow[colMap['M.3']] },
                ];
                const installments: Installment[] = installmentData
                    .map(inst => ({ amount: inst.amount && !isNaN(parseFloat(String(inst.amount))) ? parseFloat(String(inst.amount)) : undefined, isPaid: inst.amount && !isNaN(parseFloat(String(inst.amount))) ? parseFloat(String(inst.amount)) > 0 : false, paymentMethod: mapPaymentMethod(inst.method) }))
                    .filter(inst => inst.amount !== undefined && inst.amount > 0).map(inst => ({...inst, amount: inst.amount!}));
                const paidAmount = installments.reduce((sum, i) => sum + i.amount, 0);

                const sellerName = toTitleCase(mainPayerRow[colMap['VENDEDOR']]);
                const seller = allSellers.find(s => toTitleCase(s.name) === sellerName);
                const roomTypeName = toTitleCase(mainPayerRow[colMap['ROOMING']]);
                const roomType = allRoomTypes.find(rt => toTitleCase(rt.name) === roomTypeName);
                const pensionNameRaw = mainPayerRow[colMap['PENSIÓN']] || mainPayerRow[colMap['E']];
                const pensionName = pensionNameRaw ? toTitleCase(pensionNameRaw) : undefined;
                const pension = pensionName ? allPensions.find(p => toTitleCase(p.name) === pensionName) : undefined;
                const isInsured = String(mainPayerRow[colMap['SEGURO']] || '').toUpperCase() === 'SI';
                const isReleased = String(mainPayerRow[colMap['LIBERADO']] || '').toUpperCase() === 'SI';

                const reservationData: Omit<Reservation, 'id'> = {
                    tripId: trip!.id, passenger: mainPayer.fullName, passengerIds: reservationMembers.map(m => m.id), paxCount: totalPaxCount,
                    status: 'Confirmado', paymentStatus: finalPrice > 0 ? (paidAmount >= finalPrice ? "Pagado" : (paidAmount > 0 ? "Parcial" : "Pendiente")) : "Pendiente",
                    finalPrice: finalPrice, installments: { count: installments.length || 1, details: installments.length > 0 ? installments : [{ amount: finalPrice, isPaid: false }] },
                    sellerId: seller?.id || 'unassigned', boardingPointId: mainPayer.boardingPointId || null, roomTypeId: roomType?.id || null, pensionId: pension?.id || null,
                    assignedSeats: [], assignedCabins: [],
                    insuredPassengerIds: isInsured ? reservationMembers.map(m => m.id) : [], releasedPassengerIds: isReleased ? reservationMembers.map(m => m.id) : []
                };

                await saveDocument('reservations', reservationData);
                resultCounts.newReservations++;
            };

            const individualPayersRows = groupRows.filter(r => r[colMap['VALOR']] && parseFloat(String(r[colMap['VALOR']])) > 0);
            const mainGroupRows = groupRows.filter(r => !r[colMap['VALOR']] || parseFloat(String(r[colMap['VALOR']])) <= 0);

            for (const individualRow of individualPayersRows) {
                await processReservation([individualRow]);
            }

            if (mainGroupRows.length > 0) {
                await processReservation(mainGroupRows);
            }
        }
        return resultCounts;
    }


    const handleImport = async () => {
        if (!file) {
            toast({ title: "No se seleccionó ningún archivo", variant: "destructive" });
            return;
        }
        setIsLoading(true);
        setImportResult(null);

        try {
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data, { cellStyles: true, cellDates: true });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            
            const cleanedTripName = cleanTripName(file.name);

            let allTours: Tour[] = await getAllFromCollection<Tour>('tours');
            let trip = allTours.find(t => t.destination.toLowerCase() === cleanedTripName.toLowerCase());

            if (!trip) {
                 const pricingData: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1, range: "AZ179:BA184" });
                 const newPricingTiers: PricingTier[] = pricingData.map((row: any[], index: number) => {
                    const priceValue = row[1];
                    const price = (priceValue === null || priceValue === undefined || priceValue === '') ? null : parseFloat(priceValue);
                    
                    return {
                        id: `T-imported-${index}`,
                        name: row[0] || 'Desconocido',
                        price: price
                    };
                }).filter(tier => 
                    tier.name !== 'Desconocido' && 
                    toTitleCase(tier.name) !== 'TOTAL' && 
                    tier.price !== null
                ).map(tier => ({...tier, price: tier.price!}));
                
                const basePrice = newPricingTiers.find(t => t.name.toUpperCase() === 'ADULTO')?.price || 0;
                
                const placeholderId = `NEW_TRIP_${Date.now()}`;
                
                setImportResult({ newTours: 1, newReservations: 0, newPassengers: 0, updatedPassengers: 0, newBoardingPoints: 0, newRoomTypes: 0, newSellers: 0, newPensions: 0, createdTripId: placeholderId, isNewTripFlow: true });
                
                sessionStorage.setItem('tempImportData', JSON.stringify({
                    tripName: cleanedTripName,
                    price: basePrice,
                    pricingTiers: newPricingTiers
                }));
                
                setIsLoading(false); 
                return; 
            }
            
            const results = await processAndSaveData(trip, worksheet);
            setImportResult({ ...results, isNewTripFlow: false });
            window.dispatchEvent(new Event('storage'));

        } catch (error) {
            console.error("Error al importar el archivo:", error);
            toast({ title: "Error de importación", description: `No se pudo leer el archivo. Asegúrate de que el formato sea correcto. Detalle: ${error instanceof Error ? error.message : String(error)}`, variant: "destructive", duration: 9000 });
        } finally {
            setIsLoading(false);
        }
    }

    const handleSaveDateAndContinue = async () => {
        const tempImportDataRaw = sessionStorage.getItem('tempImportData');
        if (!tempImportDataRaw || !newTripDate || !file) {
            toast({ title: "Faltan datos", description: "Por favor, selecciona una fecha para el viaje.", variant: "destructive"});
            return;
        }

        setIsLoading(true);
        
        try {
            const { tripName, price, pricingTiers } = JSON.parse(tempImportDataRaw);
            
            const newTripData: Partial<Tour> = { 
                destination: tripName, 
                price: price, 
                date: newTripDate,
                pricingTiers: pricingTiers,
                transportUnits: [],
                isPublic: newTripDate >= new Date(),
            };
            const newTripId = await saveDocument('tours', newTripData);
            const createdTrip = await getDocumentById<Tour>('tours', newTripId);
            if (!createdTrip) {
                throw new Error("Failed to retrieve the newly created trip from the database.");
            }

            const data = await file!.arrayBuffer();
            const workbook = XLSX.read(data, { cellStyles: true, cellDates: true });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];

            const results = await processAndSaveData(createdTrip, worksheet);
            setImportResult({ ...results, isNewTripFlow: false, newTours: 1 });
            window.dispatchEvent(new Event('storage'));
            toast({ title: "¡Importación Exitosa!", description: "El nuevo viaje y sus reservas han sido creados." });

        } catch (error) {
             console.error("Error al guardar fecha y continuar:", error);
            toast({ title: "Error", description: `No se pudieron guardar los datos. Detalle: ${error instanceof Error ? error.message : String(error)}`, variant: "destructive", duration: 9000 });
        } finally {
            setIsLoading(false);
            sessionStorage.removeItem('tempImportData');
        }
    }

    const renderContent = () => {
        if (importResult) {
            if (importResult.isNewTripFlow) {
                 return (
                    <div className="space-y-4">
                        <Alert>
                            <CheckCircle className="h-4 w-4" />
                            <AlertTitle>Paso 1: Nuevo Viaje Detectado</AlertTitle>
                            <AlertDescription>
                                Se creará un nuevo viaje. Por favor, asigna la fecha de salida para continuar con la importación de las reservas.
                            </AlertDescription>
                        </Alert>
                         <Alert variant="default" className="border-primary">
                            <CalendarIcon className="h-4 w-4" />
                            <AlertTitle>Paso 2: Asigna la Fecha del Viaje</AlertTitle>
                            <AlertDescription>
                                <div className="space-y-2 mt-2">
                                    <Label htmlFor="new-trip-date">Fecha de Salida</Label>
                                    <DatePicker
                                        id="new-trip-date"
                                        date={newTripDate}
                                        setDate={setNewTripDate}
                                        captionLayout="dropdown-buttons"
                                        fromYear={new Date().getFullYear() - 5}
                                        toYear={new Date().getFullYear() + 5}
                                    />
                                </div>
                            </AlertDescription>
                        </Alert>
                    </div>
                )
            }

            const listItems = [
                importResult.newTours > 0 && `Viajes nuevos: ${importResult.newTours}`,
                importResult.newReservations > 0 && `Reservas creadas: ${importResult.newReservations}`,
                importResult.newPassengers > 0 && `Pasajeros nuevos: ${importResult.newPassengers}`,
                importResult.updatedPassengers > 0 && `Pasajeros actualizados: ${importResult.updatedPassengers}`,
                importResult.newSellers > 0 && `Vendedores nuevos: ${importResult.newSellers}`,
                importResult.newRoomTypes > 0 && `Tipos de habitación nuevos: ${importResult.newRoomTypes}`,
                importResult.newPensions > 0 && `Tipos de pensión nuevos: ${importResult.newPensions}`,
                importResult.newBoardingPoints > 0 && `Puntos de embarque nuevos: ${importResult.newBoardingPoints}`,
            ].filter(Boolean);
            return (
                 <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertTitle>Importación Completada</AlertTitle>
                    <AlertDescription>
                        <ul className="list-disc pl-5">
                           {listItems.length > 0 ? listItems.map((item, i) => <li key={i}>{item}</li>) : <li>No se encontraron datos nuevos para importar.</li>}
                        </ul>
                    </AlertDescription>
                </Alert>
            )
        }

        return (
             <div className="space-y-2">
                <Label htmlFor="template-file">Archivo Excel</Label>
                <Input id="template-file" type="file" onChange={handleFileChange} accept=".xlsx, .xls" />
                <DialogDescription className="text-xs pt-2">
                    El nombre del viaje se toma del nombre del archivo. Si el viaje no existe, se creará uno nuevo. Las familias se agrupan por el color de fondo de la celda "PASAJERO".
                </DialogDescription>
            </div>
        )
    }

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Importar desde Plantilla Excel</DialogTitle>
                     <DialogDescription>
                       Sube un archivo Excel para crear o actualizar un viaje con sus reservas y pasajeros.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    {renderContent()}
                </div>
                <DialogFooter>
                     {importResult && importResult.isNewTripFlow ? (
                        <>
                            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
                            <Button onClick={handleSaveDateAndContinue} disabled={!newTripDate || isLoading}>
                                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4"/>}
                                Guardar Fecha y Continuar
                            </Button>
                        </>
                    ) : importResult ? (
                        <Button onClick={() => onOpenChange(false)}>Finalizar</Button>
                    ) : (
                        <>
                            <Button variant="outline" onClick={() => onOpenChange(false)}>Cerrar</Button>
                            <Button onClick={handleImport} disabled={!file || isLoading}>
                                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
                                {isLoading ? "Procesando..." : "Importar"}
                            </Button>
                        </>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
