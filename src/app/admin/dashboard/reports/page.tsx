

"use client"

import { useState, useMemo, useEffect } from "react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from "@/components/ui/card"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from "@/components/ui/dialog"
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { BarChart3, TrendingUp, DollarSign, Plane, Users, PlusCircle, Trash2, Package, Banknote, TrendingDown, HandCoins, MountainSnow, Wallet, BookMarked, AlertCircle } from "lucide-react"
import type { Tour, Reservation, Seller, CustomExpense, ExternalCommission, ExcursionIncome, HistoryItem, PaymentMethod, TransportCost, ExtraCost } from "@/lib/types"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { ScrollArea } from "@/components/ui/scroll-area"
import { HistoryViewer } from "@/components/admin/history-viewer"
import { getAllFromCollection_client, saveDocument, deleteDocument } from "@/lib/firestore-services"
import { Separator } from "@/components/ui/separator"

type CommissionDetail = {
    sellerId: string;
    sellerName: string;
    totalCommission: number;
}

type IncomeByMethod = {
    [key in PaymentMethod]: number;
} & { indefinido: number };


type ReportData = {
    tour: Tour;
    totalIncome: number;
    incomeByMethod: IncomeByMethod;
    totalCommission: number;
    commissionDetails: CommissionDetail[];
    totalFixedCosts: number;
    fixedCostDetails: {
        transport: TransportCost[];
        hotel: number;
        extras: ExtraCost[];
    };
    netProfit: number;
    reservationCount: number;
}

type ModalType = 'commissions' | 'excursions' | 'netIncome' | 'commissionsPaid' | 'incomeBreakdown' | 'fixedCosts' | 'expenses' | null;

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(amount);
}

const InfoRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex justify-between items-center text-sm"><p className="text-muted-foreground">{label}</p><p className="font-semibold">{value}</p></div>
);


// =============================================
// MODAL COMPONENT
// =============================================
interface ReportModalProps {
    type: ModalType;
    isOpen: boolean;
    onClose: () => void;
    data: any;
    monthlyReport: any;
    onSaveNewItem: (type: 'custom_expenses' | 'external_commissions' | 'excursion_incomes', item: { description: string, amount: number}) => void;
    onDeleteItem: (type: 'custom_expenses' | 'external_commissions' | 'excursion_incomes', id: string) => void;
    newItem: { description: string, amount: string };
    setNewItem: (item: { description: string, amount: string }) => void;
}

function ReportModal({ type, isOpen, onClose, data, monthlyReport, onSaveNewItem, onDeleteItem, newItem, setNewItem }: ReportModalProps) {
    if (!isOpen) return null;

    const renderContent = () => {
        switch (type) {
            case 'commissionsPaid':
            case 'incomeBreakdown':
            case 'fixedCosts':
                return (
                    <Table>
                        <TableHeader><TableRow><TableHead>Concepto</TableHead><TableHead className="text-right">Monto</TableHead></TableRow></TableHeader>
                        <TableBody>
                            {type === 'commissionsPaid' && data?.details.map((detail: CommissionDetail) => (
                                <TableRow key={detail.sellerId}><TableCell className="font-medium">{detail.sellerName}</TableCell><TableCell className="text-right">{formatCurrency(detail.totalCommission)}</TableCell></TableRow>
                            ))}
                            {type === 'incomeBreakdown' && data && (
                                <>
                                    {Object.entries(data.details as IncomeByMethod).filter(([_, amount]) => amount > 0).map(([method, amount]) => (
                                        <TableRow key={method}><TableCell className="font-medium capitalize">{method}</TableCell><TableCell className="text-right">{formatCurrency(amount as number)}</TableCell></TableRow>
                                    ))}
                                    <TableRow className="font-bold border-t-2"><TableCell>Total Pagado</TableCell><TableCell className="text-right">{formatCurrency(Object.values(data.details as IncomeByMethod).reduce((s, a) => s + (a as number), 0))}</TableCell></TableRow>
                                </>
                            )}
                            {type === 'fixedCosts' && data?.details && (
                                <>
                                    {data.details.hotel > 0 && <TableRow><TableCell>Costo Hotel</TableCell><TableCell className="text-right">{formatCurrency(data.details.hotel)}</TableCell></TableRow>}
                                    {data.details.transport.reduce((s:number, i:TransportCost) => s + i.amount, 0) > 0 && <TableRow><TableCell>Costo Transporte Total</TableCell><TableCell className="text-right">{formatCurrency(data.details.transport.reduce((s:number, i:TransportCost) => s + i.amount, 0))}</TableCell></TableRow>}
                                    {data.details.extras.map((extra: ExtraCost, index: number) => (<TableRow key={`extra-${index}`}><TableCell>{extra.description}</TableCell><TableCell className="text-right">{formatCurrency(extra.amount)}</TableCell></TableRow>))}
                                    <TableRow className="font-bold border-t-2"><TableCell>Total Gastos Fijos</TableCell><TableCell className="text-right">{formatCurrency(data.details.hotel + data.details.transport.reduce((s:number, i:TransportCost) => s + i.amount, 0) + data.details.extras.reduce((s:number, i:ExtraCost) => s + i.amount, 0))}</TableCell></TableRow>
                                </>
                            )}
                        </TableBody>
                    </Table>
                );
            case 'expenses':
                const expenseCollectionName = 'custom_expenses';
                return (
                 <ScrollArea className="h-[60vh] -mx-6 px-6"><div className="py-4 space-y-4">
                    <Table>
                        <TableHeader><TableRow><TableHead>Concepto</TableHead><TableHead className="text-right">Monto</TableHead></TableRow></TableHeader>
                         <TableBody>
                            <TableRow className="bg-muted/50 font-semibold"><TableCell colSpan={2}>Gastos de Viajes del Mes</TableCell></TableRow>
                            {monthlyReport.totalTransportCost > 0 && <InfoRowAsTableRow label="Total Transporte" value={formatCurrency(monthlyReport.totalTransportCost)} />}
                            {monthlyReport.totalHotelCost > 0 && <InfoRowAsTableRow label="Total Hoteles" value={formatCurrency(monthlyReport.totalHotelCost)} />}
                            {monthlyReport.monthlyTotalExtrasCost.map((extra: ExtraCost, index: number) => (<InfoRowAsTableRow key={`extra-monthly-${index}`} label={extra.description} value={formatCurrency(extra.amount)} />))}
                            {monthlyReport.totalTripCommissionsPaid > 0 && <InfoRowAsTableRow label="Total Comisiones Vendedores" value={formatCurrency(monthlyReport.totalTripCommissionsPaid)} />}
                           
                           <TableRow className="bg-muted/50 font-semibold"><TableCell colSpan={2}>Gastos Varios (Manuales)</TableCell></TableRow>
                            {monthlyReport.monthlyManualExpenses.map((e: CustomExpense) => (
                                <TableRow key={e.id}>
                                    <TableCell>{e.description}</TableCell>
                                    <TableCell className="text-right flex items-center justify-end gap-2">
                                        {formatCurrency(e.amount)}
                                        <Button size="icon" variant="ghost" className="text-destructive h-7 w-7" onClick={() => onDeleteItem(expenseCollectionName, e.id)}><Trash2 className="w-4 h-4"/></Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                         </TableBody>
                    </Table>
                    <div className="p-4 border rounded-lg space-y-2 mt-4">
                        <Label>Añadir Nuevo Gasto Manual</Label>
                        <div className="flex items-center gap-2">
                            <Input placeholder="Descripción..." value={newItem.description} onChange={e => setNewItem({...newItem, description: e.target.value})}/>
                            <Input type="number" placeholder="Monto" className="w-32" value={newItem.amount} onChange={e => setNewItem({...newItem, amount: e.target.value})}/>
                            <Button onClick={() => onSaveNewItem(expenseCollectionName, { description: newItem.description, amount: Number(newItem.amount) || 0 })} size="icon" className="flex-shrink-0"><PlusCircle className="w-4 h-4"/></Button>
                        </div>
                    </div>
                </div></ScrollArea>
                )
            case 'commissions':
            case 'excursions':
                const isCommissions = type === 'commissions';
                const items = isCommissions ? monthlyReport.monthlyExternalCommissions : monthlyReport.monthlyExcursionIncomes;
                const collectionName = isCommissions ? 'external_commissions' : 'excursion_incomes';
                const title = isCommissions ? "Comisión Ganada" : "Ingreso por Excursión";
                return(
                    <ScrollArea className="h-[60vh] -mx-6 px-6"><div className="py-4 space-y-4">
                        <div className="space-y-2 mb-4">
                            {items.map((e: any) => (<div key={e.id} className="flex items-center gap-2"><div className="flex-grow"><InfoRow label={e.description} value={formatCurrency(e.amount)}/></div><Button size="icon" variant="ghost" className="text-destructive h-8 w-8" onClick={() => onDeleteItem(collectionName, e.id)}><Trash2 className="w-4 h-4"/></Button></div>))}
                        </div>
                        <div className="p-4 border rounded-lg space-y-2">
                            <Label>Añadir Nuevo {title}</Label>
                            <div className="flex items-center gap-2">
                                <Input placeholder="Descripción..." value={newItem.description} onChange={e => setNewItem({...newItem, description: e.target.value})}/>
                                <Input type="number" placeholder="Monto" className="w-32" value={newItem.amount} onChange={e => setNewItem({...newItem, amount: e.target.value})}/>
                                <Button onClick={() => onSaveNewItem(collectionName, { description: newItem.description, amount: Number(newItem.amount) || 0 })} size="icon" className="flex-shrink-0"><PlusCircle className="w-4 h-4"/></Button>
                            </div>
                        </div>
                    </div></ScrollArea>
                )
            case 'netIncome':
                 return (
                    <ScrollArea className="h-[60vh]"><div className="py-4 space-y-4 pr-6">
                        <h4 className="font-semibold text-lg text-green-600">Ingresos del Mes</h4>
                        {monthlyReport.monthlyToursData.map((rd: ReportData) => (
                            <InfoRow key={rd.tour.id} label={`Ganancia Neta - ${rd.tour.destination}`} value={formatCurrency(rd.netProfit)} />
                        ))}
                        {monthlyReport.totalCommissionIncome > 0 && <InfoRow label="Total Comisiones Externas" value={formatCurrency(monthlyReport.totalCommissionIncome)} />}
                        {monthlyReport.totalExcursionIncome > 0 && <InfoRow label="Total Ingresos Excursiones" value={formatCurrency(monthlyReport.totalExcursionIncome)} />}
                    </div></ScrollArea>
                )
            default:
                return null;
        }
    }

    const getTitle = () => {
        switch (type) {
            case 'commissionsPaid': return 'Detalle de Comisiones Pagadas';
            case 'incomeBreakdown': return 'Desglose de Ingresos';
            case 'fixedCosts': return 'Desglose de Gastos Fijos';
            case 'expenses': return 'Desglose de Gastos Mensuales';
            case 'commissions': return 'Ingresos por Comisión (Externos)';
            case 'excursions': return 'Ingresos por Excursión';
            case 'netIncome': return 'Ingreso Neto Mensual';
            default: return '';
        }
    }
    
    const getDescription = () => {
         switch (type) {
            case 'expenses': return 'Resumen de todos los gastos del mes actual.';
            case 'commissions': return 'Registra aquí las comisiones ganadas por ventas de servicios de terceros.';
            case 'excursions': return 'Registra aquí los ingresos generados por excursiones adicionales.';
            case 'netIncome': return 'Desglose de todos los ingresos del mes en curso.';
            default: return `Desglose para el viaje a ${data?.tour?.destination}.`;
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>{getTitle()}</DialogTitle>
                    <DialogDescription>{getDescription()}</DialogDescription>
                </DialogHeader>
                {renderContent()}
                <DialogFooter><Button variant="outline" onClick={onClose}>Cerrar</Button></DialogFooter>
            </DialogContent>
        </Dialog>
    )
}


// =============================================
// MAIN PAGE COMPONENT
// =============================================
export default function ReportsPage() {
    const [tours, setTours] = useState<Tour[]>([])
    const [reservations, setReservations] = useState<Reservation[]>([])
    const [sellers, setSellers] = useState<Seller[]>([]);
    const [customExpenses, setCustomExpenses] = useState<CustomExpense[]>([])
    const [externalCommissions, setExternalCommissions] = useState<ExternalCommission[]>([]);
    const [excursionIncomes, setExcursionIncomes] = useState<ExcursionIncome[]>([]);
    const [isClient, setIsClient] = useState(false)
    const [activeModal, setActiveModal] = useState<ModalType>(null);
    const [modalData, setModalData] = useState<any>(null);
    const [newItem, setNewItem] = useState({ description: "", amount: "" });
    const { toast } = useToast();
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [hasDueItems, setHasDueItems] = useState(false);


    const fetchData = async () => {
        const [toursData, reservationsData, sellersData, customExpensesData, externalCommissionsData, excursionIncomesData] = await Promise.all([
            getAllFromCollection_client<Tour>('tours'),
            getAllFromCollection_client<Reservation>('reservations'),
            getAllFromCollection_client<Seller>('sellers'),
            getAllFromCollection_client<CustomExpense>('custom_expenses'),
            getAllFromCollection_client<ExternalCommission>('external_commissions'),
            getAllFromCollection_client<ExcursionIncome>('excursion_incomes'),
        ]);

        setTours(toursData.map(t => ({...t, date: t.date ? new Date((t.date as any).seconds ? (t.date as any).toDate() : t.date) : new Date() })));
        setReservations(reservationsData);
        setSellers(sellersData);
        setCustomExpenses(customExpensesData.map(d => ({...d, date: new Date((d.date as any).seconds ? (d.date as any).toDate() : d.date)})));
        setExternalCommissions(externalCommissionsData.map(d => ({...d, date: new Date((d.date as any).seconds ? (d.date as any).toDate() : d.date)})));
        setExcursionIncomes(excursionIncomesData.map(d => ({...d, date: new Date((d.date as any).seconds ? (d.date as any).toDate() : d.date)})));
    }

    useEffect(() => {
        setIsClient(true)
        fetchData();
    }, [])

    useEffect(() => {
        if (!tours.length || !isClient) return;

        const now = new Date();
        const pastTours = tours.filter((t: Tour) => new Date(t.date) < now);
        
        if (pastTours.length > 0) {
            const reportHistory: HistoryItem[] = JSON.parse(localStorage.getItem("ytl_report_history") || "[]");
            const newHistoryItems: HistoryItem[] = [];

            pastTours.forEach((tour: Tour) => {
                if (!reportHistory.some(h => h.id === tour.id)) {
                    const tripReservations = reservations.filter(res => res.tripId === tour.id && res.status === 'Confirmado');
                    const totalIncome = tripReservations.reduce((sum, res) => sum + res.finalPrice, 0);
                    const tourCosts = tour.costs || {};
                    const transportCost = Array.isArray(tourCosts.transport) ? tourCosts.transport.reduce((sum, cost) => sum + cost.amount, 0) : 0;
                    const hotelCost = tourCosts.hotel || 0;
                    const extrasCost = (tourCosts.extras || []).reduce((sum, extra) => sum + extra.amount, 0);
                    const totalFixedCosts = transportCost + hotelCost + extrasCost;

                    const report: Partial<ReportData> = {
                        tour: tour,
                        totalIncome: totalIncome,
                        totalFixedCosts: totalFixedCosts,
                        netProfit: totalIncome - totalFixedCosts,
                        reservationCount: tripReservations.length,
                    };
                    
                    newHistoryItems.push({
                        id: tour.id,
                        name: `${tour.destination} - ${new Date(tour.date).toLocaleDateString()}`,
                        data: report,
                        savedAt: new Date().toISOString(),
                    });
                }
            });

            if (newHistoryItems.length > 0) {
                const updatedHistory = [...reportHistory, ...newHistoryItems];
                localStorage.setItem("ytl_report_history", JSON.stringify(updatedHistory));
                fetchData();
                toast({ title: `${newHistoryItems.length} reporte(s) archivado(s).`, description: "Los viajes pasados se han movido al historial." });
            }
        }

    }, [tours, reservations, isClient, toast])
    

    const reportData = useMemo((): ReportData[] => {
        const activeTours = tours.filter(t => new Date(t.date) >= new Date());
        
        return activeTours.map(tour => {
            const tripReservations = reservations.filter(res => res.tripId === tour.id && res.status === 'Confirmado');
            
            const incomeData = tripReservations.reduce((acc, res) => {
                const paidInstallments = (res.installments?.details || []).filter(inst => inst.isPaid);
                paidInstallments.forEach(inst => {
                    const method = inst.paymentMethod || 'indefinido';
                    acc.byMethod[method] = (acc.byMethod[method] || 0) + inst.amount;
                });
                acc.total += paidInstallments.reduce((sum, inst) => sum + inst.amount, 0);
                return acc;
            }, { total: 0, byMethod: { 'Tarjeta': 0, 'Efectivo': 0, 'Transferencia': 0, 'indefinido': 0 } as IncomeByMethod });

            const commissionData = tripReservations.reduce((acc, res) => {
                const seller = sellers.find(s => s.id === res.sellerId);
                if (seller && seller.useFixedCommission) {
                    const commissionAmount = res.finalPrice * ((seller.fixedCommissionRate || 0) / 100);
                    if (!acc.details[seller.id]) {
                        acc.details[seller.id] = { sellerId: seller.id, sellerName: seller.name, totalCommission: 0 };
                    }
                    acc.details[seller.id].totalCommission += commissionAmount;
                    acc.total += commissionAmount;
                }
                return acc;
            }, { total: 0, details: {} as Record<string, CommissionDetail> });

            const tourCosts = tour.costs || {};
            const transportCosts = tourCosts.transport || [];
            const hotelCost = tourCosts.hotel || 0;
            const extrasCost = tourCosts.extras || [];
            
            const totalFixedCosts = transportCosts.reduce((sum, cost) => sum + cost.amount, 0) + hotelCost + extrasCost.reduce((sum, extra) => sum + extra.amount, 0);
            
            const netProfit = incomeData.total - totalFixedCosts - commissionData.total;

            return {
                tour,
                totalIncome: incomeData.total,
                incomeByMethod: incomeData.byMethod,
                totalCommission: commissionData.total,
                commissionDetails: Object.values(commissionData.details),
                totalFixedCosts,
                fixedCostDetails: {
                    transport: transportCosts,
                    hotel: hotelCost,
                    extras: extrasCost,
                },
                netProfit,
                reservationCount: tripReservations.length
            };
        }).filter(data => data.reservationCount > 0 || data.totalFixedCosts > 0);
    }, [tours, reservations, sellers]);

    const monthlyReport = useMemo(() => {
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();

        const monthlyToursData = reportData.filter(rd => {
            const tourDate = new Date(rd.tour.date);
            return tourDate.getMonth() === currentMonth && tourDate.getFullYear() === currentYear;
        });

        const monthlyExternalCommissions = externalCommissions.filter(e => new Date(e.date).getMonth() === currentMonth && new Date(e.date).getFullYear() === currentYear);
        const totalCommissionIncome = monthlyExternalCommissions.reduce((sum, e) => sum + e.amount, 0);
        const monthlyExcursionIncomes = excursionIncomes.filter(e => new Date(e.date).getMonth() === currentMonth && new Date(e.date).getFullYear() === currentYear);
        const totalExcursionIncome = monthlyExcursionIncomes.reduce((sum, e) => sum + e.amount, 0);

        const monthlyManualExpenses = customExpenses.filter(e => new Date(e.date).getMonth() === currentMonth && new Date(e.date).getFullYear() === currentYear);
        const totalManualExpenses = monthlyManualExpenses.reduce((sum, e) => sum + e.amount, 0);
        
        const totalTripCommissionsPaid = monthlyToursData.reduce((sum, rd) => sum + rd.totalCommission, 0);
        
        const totalTransportCost = monthlyToursData.reduce((sum, rd) => sum + (rd.tour.costs?.transport || []).reduce((s, cost) => s + cost.amount, 0), 0);
        const totalHotelCost = monthlyToursData.reduce((sum, rd) => sum + (rd.tour.costs?.hotel || 0), 0);
        const monthlyTotalExtrasCost = monthlyToursData.flatMap(rd => rd.tour.costs?.extras || []);
        
        const totalMonthlyExpenses = totalTransportCost 
            + totalHotelCost 
            + monthlyTotalExtrasCost.reduce((sum, extra) => sum + extra.amount, 0)
            + totalTripCommissionsPaid 
            + totalManualExpenses;
        
        const totalProfitFromTrips = monthlyToursData.reduce((sum, rd) => sum + rd.netProfit, 0);
        const totalGrossIncome = totalProfitFromTrips + totalCommissionIncome + totalExcursionIncome;
        const totalNetIncome = totalGrossIncome - totalManualExpenses;
        
        return {
            totalMonthlyExpenses,
            totalCommissionIncome,
            monthlyExternalCommissions,
            totalExcursionIncome,
            monthlyExcursionIncomes,
            totalNetIncome,
            monthlyToursData,
            monthlyManualExpenses,
            totalTransportCost,
            totalHotelCost,
            monthlyTotalExtrasCost,
            totalTripCommissionsPaid,
            totalGrossIncome
        };
    }, [reportData, customExpenses, externalCommissions, excursionIncomes]);
    
    const handleSaveNewItem = async (collectionName: 'custom_expenses' | 'external_commissions' | 'excursion_incomes', item: {description: string, amount: number}) => {
        if (!item.description || !item.amount) {
            toast({ title: "Datos incompletos", description: "Por favor, añade descripción y monto.", variant: "destructive" });
            return;
        }
        await saveDocument(collectionName, { ...item, date: new Date() });
        await fetchData();
        setNewItem({ description: "", amount: "" });
    }

    const handleDeleteItem = async (collectionName: 'custom_expenses' | 'external_commissions' | 'excursion_incomes', id: string) => {
        await deleteDocument(collectionName, id);
        await fetchData();
    }
    
    const handleOpenModal = (type: ModalType, data?: any) => {
        setActiveModal(type);
        setModalData(data);
    }

    if (!isClient) {
        return null;
    }

    return (
        <>
            <HistoryViewer
                isOpen={isHistoryOpen}
                onOpenChange={setIsHistoryOpen}
                historyKey="ytl_report_history"
                title="Historial de Reportes"
                setHasDueItems={setHasDueItems}
            />

            <ReportModal 
                type={activeModal}
                isOpen={!!activeModal}
                onClose={() => setActiveModal(null)}
                data={modalData}
                monthlyReport={monthlyReport}
                onSaveNewItem={handleSaveNewItem}
                onDeleteItem={handleDeleteItem}
                newItem={newItem}
                setNewItem={setNewItem}
            />

            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <div><h2 className="text-2xl font-bold">Reportes Financieros</h2><p className="text-muted-foreground">Analiza los ingresos, gastos y ganancias de cada viaje activo.</p></div>
                    <Button variant="outline" onClick={() => setIsHistoryOpen(true)}>
                        {hasDueItems && <AlertCircle className="mr-2 h-4 w-4 text-destructive" />}
                        <BookMarked className="mr-2 h-4 w-4" />
                        Historial de Reportes
                    </Button>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                    <Button variant="outline" className="h-auto py-2" onClick={() => setActiveModal('commissions')}>
                        <div className="flex flex-col items-end w-full"><div className="flex items-center gap-2"><HandCoins className="w-4 h-4 text-green-600"/><span className="font-bold">Ingresos Por Comisión</span></div><span className="text-green-600 text-lg">{formatCurrency(monthlyReport.totalCommissionIncome)}</span></div>
                    </Button>
                    <Button variant="outline" className="h-auto py-2" onClick={() => setActiveModal('excursions')}>
                        <div className="flex flex-col items-end w-full"><div className="flex items-center gap-2"><MountainSnow className="w-4 h-4 text-cyan-600"/><span className="font-bold">Ingresos Por Excursión</span></div><span className="text-cyan-600 text-lg">{formatCurrency(monthlyReport.totalExcursionIncome)}</span></div>
                    </Button>
                     <Button variant="outline" className="h-auto py-2" onClick={() => setActiveModal('expenses')}>
                        <div className="flex flex-col items-end w-full"><div className="flex items-center gap-2"><TrendingDown className="w-4 h-4 text-red-600"/><span className="font-bold">Gastos Mensuales</span></div><span className="text-red-600 text-lg">{formatCurrency(monthlyReport.totalMonthlyExpenses)}</span></div>
                    </Button>
                    <Button variant="outline" className="h-auto py-2" onClick={() => setActiveModal('netIncome')}>
                        <div className="flex flex-col items-end w-full"><div className="flex items-center gap-2"><Wallet className="w-4 h-4 text-primary"/><span className="font-bold">Ingresos Mensuales (Neto)</span></div><span className="text-primary text-lg">{formatCurrency(monthlyReport.totalNetIncome)}</span></div>
                    </Button>
                </div>
                {reportData.length === 0 ? (
                    <Card><CardContent className="p-12 text-center flex flex-col items-center gap-4"><BarChart3 className="w-16 h-16 text-muted-foreground/50"/><p className="text-muted-foreground">No hay datos financieros para mostrar de los viajes activos.</p></CardContent></Card>
                ) : (
                    <Accordion type="multiple" className="w-full space-y-4" defaultValue={reportData.map(r=>r.tour.id)}>
                        {reportData.map(({ tour, totalIncome, incomeByMethod, totalCommission, commissionDetails, totalFixedCosts, fixedCostDetails, netProfit, reservationCount }) => (
                            <AccordionItem value={tour.id} key={tour.id} className="border-b-0">
                                <Card className="overflow-hidden">
                                    <AccordionTrigger className="p-4 hover:no-underline hover:bg-muted/50 text-left">
                                        <div className="flex items-center gap-4"><div className="p-2 rounded-full bg-primary/10 text-primary"><Plane className="w-5 h-5"/></div><div><p className="font-semibold">{tour.destination}</p><p className="text-sm text-muted-foreground">{reservationCount} reservas confirmadas</p></div></div>
                                    </AccordionTrigger>
                                    <AccordionContent>
                                        <div className="bg-secondary/20 p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                            <Card className="cursor-pointer hover:bg-muted/50" onClick={() => handleOpenModal('incomeBreakdown', { tour, details: incomeByMethod })}>
                                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Ingresos Totales</CardTitle><TrendingUp className="h-5 w-5 text-green-600" /></CardHeader>
                                                <CardContent><div className="text-2xl font-bold">{formatCurrency(totalIncome)}</div><p className="text-xs text-muted-foreground">Suma de todos los pagos recibidos.</p></CardContent>
                                            </Card>
                                            <Card className="cursor-pointer hover:bg-muted/50" onClick={() => totalCommission > 0 && handleOpenModal('commissionsPaid', { tour, details: commissionDetails })}>
                                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Comisiones Pagadas</CardTitle><Users className="h-5 w-5 text-red-600" /></CardHeader>
                                                <CardContent><div className="text-2xl font-bold">{formatCurrency(totalCommission)}</div><p className="text-xs text-muted-foreground">{totalCommission > 0 ? "Clic para ver detalle por vendedora." : "Sin comisiones para este viaje."}</p></CardContent>
                                            </Card>
                                            <Card className="cursor-pointer hover:bg-muted/50" onClick={() => handleOpenModal('fixedCosts', { tour, details: fixedCostDetails })}>
                                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Gastos Fijos</CardTitle><Package className="h-5 w-5 text-orange-600" /></CardHeader>
                                                <CardContent><div className="text-2xl font-bold">{formatCurrency(totalFixedCosts)}</div><p className="text-xs text-muted-foreground">Transporte, hotel y extras.</p></CardContent>
                                            </Card>
                                            <InfoCard title="Ganancia Neta" value={formatCurrency(netProfit)} icon={Banknote} color="text-primary" description="Ingresos menos gastos y comisiones."/>
                                        </div>
                                    </AccordionContent>
                                </Card>
                            </AccordionItem>
                        ))}
                    </Accordion>
                )}
            </div>
        </>
    )
}

interface InfoCardProps {
    title: string;
    value: string;
    icon: React.ElementType;
    color: string;
    description: string;
}

const InfoCard = ({ title, value, icon: Icon, color, description }: InfoCardProps) => (
    <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">{title}</CardTitle><Icon className={`h-5 w-5 ${color}`} /></CardHeader>
        <CardContent><div className="text-2xl font-bold">{value}</div><p className="text-xs text-muted-foreground">{description}</p></CardContent>
    </Card>
);

const InfoRowAsTableRow = ({ label, value }: { label: string; value: string }) => (
    <TableRow>
        <TableCell>{label}</TableCell>
        <TableCell className="text-right">{value}</TableCell>
    </TableRow>
);
    

    
