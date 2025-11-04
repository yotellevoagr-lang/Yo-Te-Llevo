
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
import { TrendingUp, ShoppingCart, Loader2, PlusCircle, Trash2, CreditCard, Banknote, Landmark, Archive, Wallet, Coins, ArrowRightLeft, TrendingDown } from "lucide-react"
import type { Tour, Reservation, Seller, CommissionSettings, CustomExpense, ExternalCommission, ExcursionIncome, PaymentMethod, TourCosts, ExtraCost } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"
import { getAllFromCollection_client, saveDocument, deleteDocument, getDocumentById } from "@/lib/firestore-services"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import { DateRangePicker } from "@/components/ui/date-range-picker"
import { DateRange } from "react-day-picker"
import { startOfMonth, endOfMonth } from "date-fns"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { DatePicker } from "@/components/ui/date-picker"
import { MonthlyReportArchive } from "@/components/admin/monthly-report-archive"

type CurrencyTotal = { ARS: number; USD: number };
const INITIAL_CURRENCY_TOTAL: CurrencyTotal = { ARS: 0, USD: 0 };
type DetailedListItem = { id: string; description: string; amount: number; currency: 'ARS' | 'USD'; date?: Date };
type ModalContent = { title: string; items: DetailedListItem[]; type: 'expense' | 'commission' | 'excursion' } | null;

const formatCurrency = (amount: number, currency: 'ARS' | 'USD' = 'ARS') => {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
}

const formatCurrencyDisplay = (total: CurrencyTotal) => {
    const arsDisplay = total.ARS !== 0 ? formatCurrency(total.ARS, 'ARS') : null;
    const usdDisplay = total.USD !== 0 ? formatCurrency(total.USD, 'USD') : null;

    if (arsDisplay && usdDisplay) {
        return <div className="flex flex-col items-end">{arsDisplay}<span className="text-sm text-green-600">{usdDisplay}</span></div>;
    }
    return arsDisplay || usdDisplay || formatCurrency(0, 'ARS');
}

const addTotals = (t1: CurrencyTotal, t2: CurrencyTotal): CurrencyTotal => ({
    ARS: t1.ARS + t2.ARS,
    USD: t1.USD + t2.USD
});

const InfoRow = ({ label, value, isExpense = false, isProfit = false, icon: Icon, onDetailsClick }: { label: string, value: React.ReactNode, isExpense?: boolean, isProfit?: boolean, icon?: React.ElementType, onDetailsClick?: () => void }) => (
    <div className="flex justify-between items-center text-sm py-1.5 border-b border-dashed">
        <div className="flex items-center gap-2">
            {Icon && <Icon className="w-4 h-4 text-muted-foreground"/>}
            <p className="text-muted-foreground">
              {label}
            </p>
        </div>
        <div className="flex items-center gap-2">
            <div className={cn("font-semibold", isExpense && "text-destructive", isProfit && "text-green-600")}>{value}</div>
            {onDetailsClick && <Button variant="ghost" size="sm" onClick={onDetailsClick} className="h-6 px-2 text-xs">Ver</Button>}
        </div>
    </div>
);

const AddItemForm = ({ onSave, type }: { onSave: (item: Omit<DetailedListItem, 'id' | 'currency'> & { currency: 'ARS' | 'USD' }) => Promise<void>, type: 'expense' | 'income' | 'commission' }) => {
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState<number | ''>('');
    const [date, setDate] = useState<Date>(new Date());
    const [isLoading, setIsLoading] = useState(false);

    const handleSave = async () => {
        if (!description || !amount) return;
        setIsLoading(true);
        await onSave({ description, amount, date, currency: 'ARS' }); // Assuming ARS for now
        setDescription('');
        setAmount('');
        setDate(new Date());
        setIsLoading(false);
    }
    
    const titleMap = {
        expense: 'Gasto Manual',
        income: 'Ingreso por Excursión',
        commission: 'Comisión Externa'
    }

    return (
        <div className="p-4 border rounded-md mt-4 space-y-3 bg-muted/30">
            <h4 className="font-semibold text-sm">Añadir Nuevo {titleMap[type]}</h4>
            <div className="flex flex-col sm:flex-row gap-2">
                <Input placeholder="Descripción" value={description} onChange={e => setDescription(e.target.value)} />
                <Input type="number" placeholder="Monto" value={amount} onChange={e => setAmount(e.target.value === '' ? '' : Number(e.target.value))} className="w-32" />
                <DatePicker date={date} setDate={(d) => setDate(d || new Date())} />
                <Button onClick={handleSave} disabled={isLoading}>
                    {isLoading ? <Loader2 className="animate-spin w-4 h-4"/> : <PlusCircle className="w-4 h-4"/>}
                </Button>
            </div>
        </div>
    )
}

export default function ReportsPage() {
    const [isClient, setIsClient] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();

    // Data states
    const [allData, setAllData] = useState<{
        tours: Tour[],
        reservations: Reservation[],
        sellers: Seller[],
        commissionSettings: CommissionSettings | null,
        customExpenses: CustomExpense[],
        externalCommissions: ExternalCommission[],
        excursionIncomes: ExcursionIncome[],
    } | null>(null);

    const [dateRange, setDateRange] = useState<DateRange | undefined>({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) });
    const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
    const [isProfitModalOpen, setIsProfitModalOpen] = useState(false);
    const [isArchiveOpen, setIsArchiveOpen] = useState(false);


    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [toursData, reservationsData, sellersData, commissionData, expensesData, extCommissionsData, excursionsData] = await Promise.all([
                getAllFromCollection_client<Tour>('tours'),
                getAllFromCollection_client<Reservation>('reservations'),
                getAllFromCollection_client<Seller>('sellers'),
                getDocumentById<CommissionSettings>('settings', 'commissions'),
                getAllFromCollection_client<CustomExpense>('custom_expenses'),
                getAllFromCollection_client<ExternalCommission>('external_commissions'),
                getAllFromCollection_client<ExcursionIncome>('excursion_incomes'),
            ]);
            
            setAllData({
                tours: toursData.map(t => ({ ...t, date: t.date ? new Date((t.date as any).seconds ? (t.date as any).toDate() : t.date) : new Date() })),
                reservations: reservationsData,
                sellers: sellersData,
                commissionSettings: commissionData,
                customExpenses: expensesData.map(d => ({ ...d, date: new Date((d.date as any).seconds ? (d.date as any).toDate() : d.date) })),
                externalCommissions: extCommissionsData.map(d => ({ ...d, date: new Date((d.date as any).seconds ? (d.date as any).toDate() : d.date) })),
                excursionIncomes: excursionsData.map(d => ({ ...d, date: new Date((d.date as any).seconds ? (d.date as any).toDate() : d.date) })),
            })
            
        } catch (error) {
            console.error(error);
            toast({ title: "Error al cargar datos", description: "No se pudo obtener la información para los reportes.", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        setIsClient(true);
        fetchData();
        
        const handleStorageChange = () => fetchData();
        window.addEventListener('storage', handleStorageChange);
        return () => {
            window.removeEventListener('storage', handleStorageChange);
        }

    }, []);

    const filteredData = useMemo(() => {
        if (!allData) return null;
        const from = dateRange?.from || new Date(0);
        const to = dateRange?.to || new Date();
        to.setHours(23, 59, 59, 999);

        const filterByDate = <T extends { date: Date }>(items: T[]) => items.filter(item => item.date >= from && item.date <= to);
        
        const toursInDateRange = allData.tours.filter(t => t.date >= from && t.date <= to);
        const toursInDateRangeIds = new Set(toursInDateRange.map(t => t.id));
        
        return {
            tours: toursInDateRange,
            reservations: allData.reservations.filter(r => toursInDateRangeIds.has(r.tripId)),
            customExpenses: filterByDate(allData.customExpenses),
            externalCommissions: filterByDate(allData.externalCommissions),
            excursionIncomes: filterByDate(allData.excursionIncomes),
        }
    }, [dateRange, allData]);


    const reportData = useMemo(() => {
        if (!filteredData || !allData) return null;

        const calculateCommission = (reservation: Reservation): CurrencyTotal => {
            if (!allData.sellers || !allData.commissionSettings?.rules) return INITIAL_CURRENCY_TOTAL;

            const seller = allData.sellers.find(s => s.id === reservation.sellerId);
            if (!seller) return INITIAL_CURRENCY_TOTAL;

            const currency = allData.tours.find(t => t.id === reservation.tripId)?.currency || 'ARS';
            let rate = 0;

            if (seller.useFixedCommission) {
                rate = seller.fixedCommissionRate || 0;
            } else {
                 const rule = allData.commissionSettings.rules.find(r => reservation.paxCount >= r.from && (r.to === 'infinite' || reservation.paxCount <= r.to));
                if (rule) rate = rule.rate;
            }

            const commissionAmount = (reservation.finalPrice * rate) / 100;
            return { ...INITIAL_CURRENCY_TOTAL, [currency]: commissionAmount };
        };
        
        const totalReservationIncome = filteredData.reservations.reduce((acc, res) => {
            const currency = allData.tours.find(t => t.id === res.tripId)?.currency || 'ARS';
            const paidAmount = res.installments?.details.filter(i => i.isPaid).reduce((sum, i) => sum + i.amount, 0) || 0;
            return { ...acc, [currency as 'ARS' | 'USD']: (acc[currency as 'ARS' | 'USD'] || 0) + paidAmount };
        }, { ...INITIAL_CURRENCY_TOTAL });
        
        const totalExcursionIncome = filteredData.excursionIncomes.reduce((acc, item) => ({ ...acc, [item.currency || 'ARS']: (acc[item.currency || 'ARS'] || 0) + item.amount }), { ...INITIAL_CURRENCY_TOTAL });
        const totalExternalCommissions = filteredData.externalCommissions.reduce((acc, item) => ({ ...acc, [item.currency || 'ARS']: (acc[item.currency || 'ARS'] || 0) + item.amount }), { ...INITIAL_CURRENCY_TOTAL });
        
        const totalIncome = [totalReservationIncome, totalExcursionIncome, totalExternalCommissions].reduce(addTotals, { ...INITIAL_CURRENCY_TOTAL });
        const incomeByMethod = filteredData.reservations.reduce((acc, res) => {
                const tour = allData.tours.find(t => t.id === res.tripId);
                const paidInstallments = res.installments?.details.filter(i => i.isPaid) || [];
                paidInstallments.forEach(inst => {
                    const method = inst.paymentMethod || 'Efectivo';
                    if (!acc[method]) acc[method] = {...INITIAL_CURRENCY_TOTAL};
                    acc[method] = { ...acc[method], [tour?.currency || 'ARS']: (acc[method][tour?.currency || 'ARS'] || 0) + inst.amount };
                });
                return acc;
            }, {} as Record<PaymentMethod, CurrencyTotal>);

        const totalCommissionsPaid = filteredData.reservations.reduce((acc, res) => addTotals(acc, calculateCommission(res)), { ...INITIAL_CURRENCY_TOTAL });
        
        const totalTourFixedCosts = filteredData.tours.reduce((acc, tour) => {
            const costs: TourCosts = tour.costs || { transport: [], hotel: { amount: 0, currency: 'ARS' }, extras: [] };
            const hotelCost = { ...INITIAL_CURRENCY_TOTAL, [costs.hotel?.currency || 'ARS']: costs.hotel?.amount || 0 };
            const transportCost = (costs.transport || []).reduce((sum, c) => ({...sum, [c.currency || 'ARS']: (sum[c.currency || 'ARS'] || 0) + c.amount}), {...INITIAL_CURRENCY_TOTAL});
            return addTotals(acc, addTotals(hotelCost, transportCost));
        }, { ...INITIAL_CURRENCY_TOTAL });

        const totalTourExtraCosts = filteredData.tours.reduce((acc, tour) => {
             const extrasCost = (tour.costs?.extras || []).reduce((sum, e) => ({...sum, [e.currency || 'ARS']: (sum[e.currency || 'ARS'] || 0) + e.amount}), {...INITIAL_CURRENCY_TOTAL});
             return addTotals(acc, extrasCost);
        }, { ...INITIAL_CURRENCY_TOTAL });
        
        const totalCustomExpenses = filteredData.customExpenses.reduce((acc, item) => ({ ...acc, [item.currency || 'ARS']: (acc[item.currency || 'ARS'] || 0) + item.amount }), { ...INITIAL_CURRENCY_TOTAL });
        
        const totalExpenses = [totalCommissionsPaid, totalTourFixedCosts, totalTourExtraCosts, totalCustomExpenses].reduce(addTotals, { ...INITIAL_CURRENCY_TOTAL });

        const netProfit = { ARS: totalIncome.ARS - totalExpenses.ARS, USD: totalIncome.USD - totalExpenses.USD };
        
        const tripReports = filteredData.tours.map(tour => {
             const tourReservations = allData.reservations.filter(r => r.tripId === tour.id);
             
             const tripIncomeByMethod = tourReservations.reduce((acc, res) => {
                const paidInstallments = res.installments?.details.filter(i => i.isPaid) || [];
                paidInstallments.forEach(inst => {
                    const method = inst.paymentMethod || 'Efectivo';
                    if (!acc[method]) acc[method] = {...INITIAL_CURRENCY_TOTAL};
                    acc[method] = { ...acc[method], [tour.currency || 'ARS']: (acc[method][tour.currency || 'ARS'] || 0) + inst.amount };
                });
                return acc;
            }, {} as Record<PaymentMethod, CurrencyTotal>);

             const tourIncome = Object.values(tripIncomeByMethod).reduce(addTotals, {...INITIAL_CURRENCY_TOTAL});

             const tourCommissions = tourReservations.reduce((acc, res) => addTotals(acc, calculateCommission(res)), { ...INITIAL_CURRENCY_TOTAL });

             const tourCosts = tour.costs || { transport: [], hotel: { amount: 0, currency: 'ARS' }, extras: [] };
             const hotelCost = { ...INITIAL_CURRENCY_TOTAL, [tourCosts.hotel?.currency || 'ARS']: tourCosts.hotel?.amount || 0 };
             const transportCost = (tourCosts.transport || []).reduce((sum, c) => ({...sum, [c.currency || 'ARS']: (sum[c.currency || 'ARS'] || 0) + c.amount}), {...INITIAL_CURRENCY_TOTAL});
             const extrasCost = (tourCosts.extras || []).reduce((sum, e) => ({...sum, [e.currency || 'ARS']: (sum[e.currency || 'ARS'] || 0) + e.amount}), {...INITIAL_CURRENCY_TOTAL});
             const totalFixedCosts = addTotals(hotelCost, addTotals(transportCost, extrasCost));
             
             const netProfit = { ARS: tourIncome.ARS - totalFixedCosts.ARS - tourCommissions.ARS, USD: tourIncome.USD - totalFixedCosts.USD - tourCommissions.USD };
             
             return { tour, totalIncome: tourIncome, incomeByMethod: tripIncomeByMethod, totalFixedCosts, totalCommission: tourCommissions, netProfit };
        });

        return { totalIncome, totalExpenses, netProfit, totalCommissionsPaid, totalExcursionIncome, totalExternalCommissions, totalCustomExpenses, tripReports, totalTourFixedCosts, totalTourExtraCosts, totalReservationIncome, incomeByMethod };
    }, [filteredData, allData]);

    const handleSaveNewItem = async (item: Omit<DetailedListItem, 'id' | 'currency'> & { currency: 'ARS' | 'USD' }, type: 'expense' | 'commission' | 'excursion') => {
        const collectionMap = {
            expense: 'custom_expenses',
            commission: 'external_commissions',
            excursion: 'excursion_incomes',
        };
        const collectionName = collectionMap[type];
        
        try {
            await saveDocument(collectionName, item);
            await fetchData();
        } catch (error) {
            toast({ title: "Error al guardar", description: `No se pudo guardar el item.`, variant: "destructive" });
        }
    }

    const handleDeleteItem = async (id: string, type: 'expense' | 'commission' | 'excursion') => {
        const collectionMap = {
            expense: 'custom_expenses',
            commission: 'external_commissions',
            excursion: 'excursion_incomes',
        };
        const collectionName = collectionMap[type];
        try {
            await deleteDocument(collectionName, id);
            await fetchData();
        } catch (error) {
             toast({ title: "Error al eliminar", description: `No se pudo eliminar el item.`, variant: "destructive" });
        }
    }

    if (!isClient || isLoading || !allData) {
        return <div className="flex h-full w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    if (!reportData || !filteredData) {
      return <div className="flex items-center justify-center h-64"><p>Calculando datos...</p><Loader2 className="w-8 h-8 animate-spin" /></div>;
    }
    
    const { totalIncome, totalExpenses, netProfit, totalCommissionsPaid, totalExcursionIncome, totalExternalCommissions, totalCustomExpenses, tripReports, totalTourFixedCosts, totalTourExtraCosts, totalReservationIncome, incomeByMethod } = reportData;
    
    return (
        <>
            <MonthlyReportArchive isOpen={isArchiveOpen} onOpenChange={setIsArchiveOpen} allData={allData} />
            
            <Dialog open={isExpenseModalOpen} onOpenChange={setIsExpenseModalOpen}>
                <DialogContent className="max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>Desglose de Gastos del Período</DialogTitle>
                    </DialogHeader>
                     <div className="max-h-[60vh] overflow-y-auto pr-2 space-y-4">
                        <InfoRow label="Costo Fijo de Viajes (Transporte, Hotel)" value={formatCurrencyDisplay(totalTourFixedCosts)} />
                        <InfoRow label="Comisiones Pagadas a Vendedores" value={formatCurrencyDisplay(totalCommissionsPaid)} />
                        <InfoRow label="Gastos Extras de Viajes" value={formatCurrencyDisplay(totalTourExtraCosts)} />
                        <Separator/>
                        <h4 className="font-semibold text-md">Gastos Manuales</h4>
                         <Table>
                            <TableHeader><TableRow><TableHead>Descripción</TableHead><TableHead>Fecha</TableHead><TableHead className="text-right">Monto</TableHead><TableHead></TableHead></TableRow></TableHeader>
                            <TableBody>
                                {filteredData.customExpenses.map(item => (
                                    <TableRow key={item.id}>
                                        <TableCell>{item.description}</TableCell>
                                        <TableCell>{item.date ? new Date(item.date).toLocaleDateString() : 'N/A'}</TableCell>
                                        <TableCell className="text-right">{formatCurrency(item.amount, item.currency)}</TableCell>
                                        <TableCell><Button variant="ghost" size="icon" onClick={() => handleDeleteItem(item.id, 'expense')}><Trash2 className="w-4 h-4 text-destructive"/></Button></TableCell>
                                    </TableRow>
                                ))}
                                {filteredData.customExpenses.length === 0 && <TableRow><TableCell colSpan={4} className="text-center">No hay gastos manuales</TableCell></TableRow>}
                            </TableBody>
                        </Table>
                         <AddItemForm onSave={(item) => handleSaveNewItem(item, 'expense')} type="expense" />
                     </div>
                     <DialogFooter><Button variant="outline" onClick={() => setIsExpenseModalOpen(false)}>Cerrar</Button></DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isProfitModalOpen} onOpenChange={setIsProfitModalOpen}>
                 <DialogContent className="max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>Desglose de Ingresos del Período</DialogTitle>
                    </DialogHeader>
                     <div className="max-h-[60vh] overflow-y-auto pr-2 space-y-4">
                        <InfoRow label="Total Ingresos por Reservas" value={formatCurrencyDisplay(totalReservationIncome)} icon={TrendingUp} isProfit />
                        <div className="pl-6 space-y-1 text-sm border-l-2 ml-2">
                            <h4 className="font-semibold text-md pt-2">Por Método de Pago</h4>
                            <InfoRow label="Tarjeta" value={formatCurrencyDisplay(incomeByMethod['Tarjeta'] || INITIAL_CURRENCY_TOTAL)} icon={CreditCard}/>
                            <InfoRow label="Transferencia" value={formatCurrencyDisplay(incomeByMethod['Transferencia'] || INITIAL_CURRENCY_TOTAL)} icon={Landmark}/>
                            <InfoRow label="Efectivo" value={formatCurrencyDisplay(incomeByMethod['Efectivo'] || INITIAL_CURRENCY_TOTAL)} icon={Banknote}/>
                        </div>
                         
                        <Separator className="my-4"/>
                         <h4 className="font-semibold text-md">Ingresos por Comisiones Externas</h4>
                        <Table>
                          <TableHeader><TableRow><TableHead>Descripción</TableHead><TableHead>Fecha</TableHead><TableHead className="text-right">Monto</TableHead><TableHead></TableHead></TableRow></TableHeader>
                          <TableBody>
                            {filteredData.externalCommissions.map(item => (
                                <TableRow key={item.id}>
                                    <TableCell>{item.description}</TableCell>
                                    <TableCell>{item.date ? new Date(item.date).toLocaleDateString() : 'N/A'}</TableCell>
                                    <TableCell className="text-right">{formatCurrency(item.amount, item.currency)}</TableCell>
                                    <TableCell><Button variant="ghost" size="icon" onClick={() => handleDeleteItem(item.id, 'commission')}><Trash2 className="w-4 h-4 text-destructive"/></Button></TableCell>
                                </TableRow>
                            ))}
                            {filteredData.externalCommissions.length === 0 && <TableRow><TableCell colSpan={4} className="text-center">No hay comisiones externas.</TableCell></TableRow>}
                          </TableBody>
                        </Table>
                        <AddItemForm onSave={(item) => handleSaveNewItem(item, 'commission')} type="commission" />
                        <Separator/>
                         <h4 className="font-semibold text-md">Ingresos por Excursiones</h4>
                         <Table>
                            <TableHeader><TableRow><TableHead>Descripción</TableHead><TableHead>Fecha</TableHead><TableHead className="text-right">Monto</TableHead><TableHead></TableHead></TableRow></TableHeader>
                            <TableBody>
                                {filteredData.excursionIncomes.map(item => (
                                    <TableRow key={item.id}>
                                        <TableCell>{item.description}</TableCell>
                                        <TableCell>{item.date ? new Date(item.date).toLocaleDateString() : 'N/A'}</TableCell>
                                        <TableCell className="text-right">{formatCurrency(item.amount, item.currency)}</TableCell>
                                        <TableCell><Button variant="ghost" size="icon" onClick={() => handleDeleteItem(item.id, 'excursion')}><Trash2 className="w-4 h-4 text-destructive"/></Button></TableCell>
                                    </TableRow>
                                ))}
                                {filteredData.excursionIncomes.length === 0 && <TableRow><TableCell colSpan={4} className="text-center">No hay ingresos por excursiones.</TableCell></TableRow>}
                            </TableBody>
                        </Table>
                         <AddItemForm onSave={(item) => handleSaveNewItem(item, 'excursion')} type="income" />
                     </div>
                      <DialogFooter><Button variant="outline" onClick={() => setIsProfitModalOpen(false)}>Cerrar</Button></DialogFooter>
                 </DialogContent>
            </Dialog>

            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h2 className="text-2xl font-bold">Reportes Financieros</h2>
                        <p className="text-muted-foreground">Analiza los ingresos, gastos y ganancias de tu negocio.</p>
                    </div>
                    <div className="flex items-center gap-2">
                         <Button variant="outline" onClick={() => setIsArchiveOpen(true)}>
                            <Archive className="mr-2 h-4 w-4" /> Historial de Reportes
                        </Button>
                        <DateRangePicker date={dateRange} setDate={setDateRange} />
                    </div>
                </div>
                
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Ingresos por Reservas</CardTitle><Coins className="h-4 w-4 text-muted-foreground"/></CardHeader><CardContent><div className="text-2xl font-bold">{formatCurrencyDisplay(totalReservationIncome)}</div></CardContent></Card>
                    <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Otros Ingresos</CardTitle><Coins className="h-4 w-4 text-muted-foreground"/></CardHeader><CardContent><div className="text-2xl font-bold">{formatCurrencyDisplay(addTotals(totalExcursionIncome, totalExternalCommissions))}</div></CardContent></Card>
                    <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Total Egresos</CardTitle><ShoppingCart className="h-4 w-4 text-muted-foreground"/></CardHeader><CardContent><div className="text-2xl font-bold">{formatCurrencyDisplay(totalExpenses)}</div></CardContent></Card>
                    <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Ganancia Neta</CardTitle><Wallet className="h-4 w-4 text-muted-foreground"/></CardHeader><CardContent><div className="text-2xl font-bold">{formatCurrencyDisplay(netProfit)}</div></CardContent></Card>
                </div>
                
                <div className="flex gap-4 pt-4">
                    <Button onClick={() => setIsExpenseModalOpen(true)}>
                        Gasto Neto Mensual
                    </Button>
                    <Button onClick={() => setIsProfitModalOpen(true)}>
                        Ganancia Neta Mensual
                    </Button>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Análisis por Viaje</CardTitle>
                        <CardDescription>Rentabilidad y desglose financiero de cada viaje en el período seleccionado.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {tripReports.length > 0 ? (
                        <Accordion type="multiple" className="w-full space-y-2">
                            {tripReports.map((report) => (
                                <AccordionItem value={report.tour.id} key={report.tour.id} className="border rounded-lg">
                                    <AccordionTrigger className="px-4 hover:no-underline text-base">
                                        <div className="flex justify-between items-center w-full">
                                            <span>{report.tour.destination}</span>
                                            <div className={cn("font-semibold mr-4", report.netProfit.ARS >= 0 ? "text-green-600" : "text-destructive")}>
                                                {formatCurrencyDisplay(report.netProfit)}
                                            </div>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="p-4 bg-muted/30 space-y-2">
                                        <InfoRow label="Ingresos Totales por Reservas" value={formatCurrencyDisplay(report.totalIncome)} />
                                        <div className="pl-6 space-y-1 text-xs">
                                          <InfoRow label="Tarjeta" value={formatCurrencyDisplay(report.incomeByMethod['Tarjeta'] || INITIAL_CURRENCY_TOTAL)} icon={CreditCard}/>
                                          <InfoRow label="Transferencia" value={formatCurrencyDisplay(report.incomeByMethod['Transferencia'] || INITIAL_CURRENCY_TOTAL)} icon={Landmark}/>
                                          <InfoRow label="Efectivo" value={formatCurrencyDisplay(report.incomeByMethod['Efectivo'] || INITIAL_CURRENCY_TOTAL)} icon={Banknote}/>
                                        </div>
                                        <Separator className="my-2"/>
                                        <InfoRow label="Comisiones de Vendedores" value={formatCurrencyDisplay(report.totalCommission)} isExpense/>
                                        <InfoRow label="Costos Fijos del Viaje" value={formatCurrencyDisplay(report.totalFixedCosts)} isExpense/>
                                        <Separator className="my-2"/>
                                        <InfoRow label="Ganancia Neta del Viaje" value={formatCurrencyDisplay(report.netProfit)} isProfit={report.netProfit.ARS >= 0 && report.netProfit.USD >= 0} />
                                    </AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
                        ) : (
                             <p className="text-center text-muted-foreground py-8">No hay datos de viajes para el período seleccionado.</p>
                        )}
                    </CardContent>
                </Card>
            </div>
        </>
    );
}
