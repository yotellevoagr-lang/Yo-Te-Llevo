"use client"

import { useState, useMemo, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import { Loader2, Download } from "lucide-react"
import type { Tour, Reservation, Seller, CommissionSettings, CustomExpense, ExternalCommission, ExcursionIncome, PaymentMethod, TourCosts } from "@/lib/types"
import { endOfMonth } from "date-fns"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import { toTitleCase } from "@/lib/utils"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface MonthlyReportArchiveProps {
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
  allData: {
    tours: Tour[]
    reservations: Reservation[]
    sellers: Seller[]
    commissionSettings: CommissionSettings | null
    customExpenses: CustomExpense[]
    externalCommissions: ExternalCommission[]
    excursionIncomes: ExcursionIncome[]
  } | null
}

type CurrencyTotal = { ARS: number; USD: number };
const INITIAL_CURRENCY_TOTAL: CurrencyTotal = { ARS: 0, USD: 0 };

const formatCurrency = (amount: number, currency: 'ARS' | 'USD' = 'ARS') => {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
}

const addTotals = (t1: CurrencyTotal, t2: CurrencyTotal): CurrencyTotal => ({
    ARS: t1.ARS + t2.ARS,
    USD: t1.USD + t2.USD
});

export function MonthlyReportArchive({ isOpen, onOpenChange, allData }: MonthlyReportArchiveProps) {
  const [isLoading, setIsLoading] = useState(false);

  const archivedMonths = useMemo(() => {
    if (!allData) return [];
    
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const relevantMonths = new Set<string>();
    
    allData.tours
      .filter(tour => new Date(tour.date) < now)
      .forEach(tour => {
        const monthKey = tour.date.toISOString().slice(0, 7);
        relevantMonths.add(monthKey);
    });
    
    return Array.from(relevantMonths)
        .sort((a, b) => b.localeCompare(a))
        .slice(0, 12);
  }, [allData]);

  const calculateReportForMonth = (monthKey: string) => {
    if (!allData) return null;
    const from = new Date(monthKey + '-01T00:00:00');
    const to = endOfMonth(from);

    const filterByDate = <T extends { date: Date }>(items: T[]) => items.filter(item => {
        const itemDate = new Date(item.date);
        return itemDate >= from && itemDate <= to;
    });
    
    const toursInMonth = allData.tours.filter(t => new Date(t.date) >= from && new Date(t.date) <= to);
    
    const filteredData = {
        tours: toursInMonth,
        reservations: allData.reservations.filter(r => {
            const tour = allData.tours.find(t => t.id === r.tripId);
            if (!tour) return false;
            const tourDate = new Date(tour.date);
            return tourDate >= from && tourDate <= to;
        }),
        customExpenses: filterByDate(allData.customExpenses),
        externalCommissions: filterByDate(allData.externalCommissions),
        excursionIncomes: filterByDate(allData.excursionIncomes),
    };

    const calculateCommission = (reservation: Reservation): CurrencyTotal => {
        const seller = allData.sellers.find(s => s.id === reservation.sellerId);
        if (!seller || !allData.commissionSettings) return INITIAL_CURRENCY_TOTAL;
        const currency = allData.tours.find(t => t.id === reservation.tripId)?.currency || 'ARS';
        let rate = 0;
        if (seller.useFixedCommission) {
            rate = seller.fixedCommissionRate || 0;
        } else {
            const rule = allData.commissionSettings.rules.find(r => reservation.paxCount >= r.from && (r.to === 'infinite' || reservation.paxCount <= r.to));
            if (rule) rate = rule.rate;
        }
        return { ...INITIAL_CURRENCY_TOTAL, [currency]: (reservation.finalPrice * rate) / 100 };
    };

    const totalReservationIncome = filteredData.reservations.reduce((acc, res) => {
        const currency = allData.tours.find(t => t.id === res.tripId)?.currency || 'ARS';
        const paidAmount = res.installments?.details.filter(i => i.isPaid).reduce((sum, i) => sum + i.amount, 0) || 0;
        return { ...acc, [currency as 'ARS' | 'USD']: (acc[currency as 'ARS' | 'USD'] || 0) + paidAmount };
    }, { ...INITIAL_CURRENCY_TOTAL });
    const totalExcursionIncome = filteredData.excursionIncomes.reduce((acc, item) => ({ ...acc, [item.currency || 'ARS']: (acc[item.currency || 'ARS'] || 0) + item.amount }), { ...INITIAL_CURRENCY_TOTAL });
    const totalExternalCommissions = filteredData.externalCommissions.reduce((acc, item) => ({ ...acc, [item.currency || 'ARS']: (acc[item.currency || 'ARS'] || 0) + item.amount }), { ...INITIAL_CURRENCY_TOTAL });
    const totalIncome = [totalReservationIncome, totalExcursionIncome, totalExternalCommissions].reduce(addTotals, { ...INITIAL_CURRENCY_TOTAL });
    
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
        const tourIncome = tourReservations.reduce((acc, res) => {
            const currency = tour.currency || 'ARS';
            const paidAmount = res.installments?.details.filter(i => i.isPaid).reduce((sum, i) => sum + i.amount, 0) || 0;
            return { ...acc, [currency]: (acc[currency] || 0) + paidAmount };
        }, { ...INITIAL_CURRENCY_TOTAL });
        const tourCommissions = tourReservations.reduce((acc, res) => addTotals(acc, calculateCommission(res)), { ...INITIAL_CURRENCY_TOTAL });
        const costs = tour.costs || { transport: [], hotel: { amount: 0, currency: 'ARS' }, extras: [] };
        const hotelCost = { ...INITIAL_CURRENCY_TOTAL, [costs.hotel?.currency || 'ARS']: costs.hotel?.amount || 0 };
        const transportCost = (costs.transport || []).reduce((sum, c) => ({...sum, [c.currency || 'ARS']: (sum[c.currency || 'ARS'] || 0) + c.amount}), {...INITIAL_CURRENCY_TOTAL});
        const extrasCost = (costs.extras || []).reduce((sum, e) => ({...sum, [e.currency || 'ARS']: (sum[e.currency || 'ARS'] || 0) + e.amount}), {...INITIAL_CURRENCY_TOTAL});
        const tourNetProfit = { ARS: tourIncome.ARS - hotelCost.ARS - transportCost.ARS - extrasCost.ARS - tourCommissions.ARS, USD: tourIncome.USD - hotelCost.USD - transportCost.USD - extrasCost.USD - tourCommissions.USD };
        return { tour, tourIncome, tourCommissions, hotelCost, transportCost, extrasCost, tourNetProfit };
    });

    return { totalIncome, totalExpenses, netProfit, tripReports, filteredData, totalCommissionsPaid, totalTourFixedCosts, totalTourExtraCosts, totalCustomExpenses, totalExcursionIncome, totalExternalCommissions };
  }

  const generatePdf = async (monthKey: string, tripId?: string) => {
    setIsLoading(true);
    const report = calculateReportForMonth(monthKey);
    if (!report) {
        setIsLoading(false);
        return;
    }
    
    const doc = new jsPDF();
    let yPos = 20;

    const addText = (text: string, x: number, y: number, options: any = {}) => {
        doc.text(text, x, y, options);
    };

    if (tripId) {
        // --- Single Trip Report ---
        const tripReport = report.tripReports.find(tr => tr.tour.id === tripId);
        if (!tripReport) {
            setIsLoading(false);
            return;
        }
        addText(`Desglose del Viaje: ${tripReport.tour.destination}`, 105, yPos, { align: 'center' }); yPos += 15;
        
        autoTable(doc, {
            startY: yPos,
            head: [['Ingresos', 'ARS', 'USD']],
            body: [['Ingresos por Reservas', formatCurrency(tripReport.tourIncome.ARS), formatCurrency(tripReport.tourIncome.USD, 'USD')]],
            theme: 'striped', headStyles: { fillColor: [22, 163, 74] }
        });
        yPos = (doc as any).lastAutoTable.finalY + 10;
        
        autoTable(doc, {
            startY: yPos,
            head: [['Gastos', 'ARS', 'USD']],
            body: [
                ['Costo de Hotel', formatCurrency(tripReport.hotelCost.ARS), formatCurrency(tripReport.hotelCost.USD, 'USD')],
                ['Costo de Transporte', formatCurrency(tripReport.transportCost.ARS), formatCurrency(tripReport.transportCost.USD, 'USD')],
                ['Comisiones Pagadas', formatCurrency(tripReport.tourCommissions.ARS), formatCurrency(tripReport.tourCommissions.USD, 'USD')],
                ['Gastos Extras del Viaje', formatCurrency(tripReport.extrasCost.ARS), formatCurrency(tripReport.extrasCost.USD, 'USD')],
            ],
            theme: 'striped', headStyles: { fillColor: [220, 38, 38] }
        });
        yPos = (doc as any).lastAutoTable.finalY + 10;

        autoTable(doc, {
            startY: yPos,
            body: [['Ganancia Neta del Viaje', formatCurrency(tripReport.tourNetProfit.ARS), formatCurrency(tripReport.tourNetProfit.USD, 'USD')]],
            theme: 'grid', bodyStyles: { fontStyle: 'bold' }
        });

        doc.save(`Desglose_${tripReport.tour.destination.replace(/ /g, '_')}.pdf`);
    } else {
        // --- Full Monthly Report ---
        const monthName = toTitleCase(new Date(monthKey + '-02').toLocaleString('es-ES', { month: 'long', year: 'numeric' }));
        addText(`Reporte Mensual: ${monthName}`, 105, yPos, { align: 'center' }); yPos += 10;
        
        const chartData = [{ name: 'Mes', Ingresos: report.totalIncome.ARS, Gastos: report.totalExpenses.ARS }];
        const chartElement = document.createElement('div');
        chartElement.style.width = '700px';
        chartElement.style.height = '350px';
        document.body.appendChild(chartElement);
        
        const chartComponent = (
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis tickFormatter={(value) => `$${(value/1000)}k`} />
                    <Tooltip formatter={(value: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS'}).format(value)} />
                    <Legend />
                    <Bar dataKey="Ingresos" fill="#16a34a" />
                    <Bar dataKey="Gastos" fill="#dc2626" />
                </BarChart>
            </ResponsiveContainer>
        );
        // This part is tricky, we need to render the chart to an image.
        // We'll skip this for now and just add tables.

        const profitMargin = report.totalIncome.ARS === 0 ? 0 : (report.netProfit.ARS / report.totalIncome.ARS) * 100;
        let performanceText = "Regular.";
        if(profitMargin > 30) performanceText = "Excelente!";
        else if (profitMargin > 15) performanceText = "Bueno.";
        
        autoTable(doc, {
            startY: yPos,
            head: [['Resumen del Mes', 'Total ARS', 'Total USD']],
            body: [
                ['Ingresos Totales', formatCurrency(report.totalIncome.ARS), formatCurrency(report.totalIncome.USD, 'USD')],
                ['Gastos Totales', formatCurrency(report.totalExpenses.ARS), formatCurrency(report.totalExpenses.USD, 'USD')],
                [{content: 'Ganancia Neta', styles: {fontStyle: 'bold'}}, {content: formatCurrency(report.netProfit.ARS), styles: {fontStyle: 'bold'}}, {content: formatCurrency(report.netProfit.USD, 'USD'), styles: {fontStyle: 'bold'}}],
                ['Margen de Ganancia', `${profitMargin.toFixed(2)}%`, 'N/A'],
                ['Rendimiento del Mes', performanceText, '']
            ],
            theme: 'grid', headStyles: { fillColor: [74, 85, 104] }
        });
        yPos = (doc as any).lastAutoTable.finalY + 10;
        
        doc.addPage();
        yPos = 20;

        addText('Desglose de Ingresos', 14, yPos); yPos += 5;
        autoTable(doc, { startY: yPos, head: [['Categoría', 'Descripción', 'Monto']], body: [
                ...report.filteredData.excursionIncomes.map(i => ['Ingreso por Excursión', i.description, formatCurrency(i.amount, i.currency)]),
                ...report.filteredData.externalCommissions.map(i => ['Comisión Externa', i.description, formatCurrency(i.amount, i.currency)]),
            ]
        });
        yPos = (doc as any).lastAutoTable.finalY + 10;

        addText('Desglose de Gastos', 14, yPos); yPos += 5;
        autoTable(doc, { startY: yPos, head: [['Categoría', 'Descripción', 'Monto']], body: [
                ['Costo Fijo de Viajes', `Hotel, transporte, etc.`, `${formatCurrency(report.totalTourFixedCosts.ARS)} | ${formatCurrency(report.totalTourFixedCosts.USD, 'USD')}`],
                ['Comisiones de Vendedores', `Pagado a vendedores`, `${formatCurrency(report.totalCommissionsPaid.ARS)} | ${formatCurrency(report.totalCommissionsPaid.USD, 'USD')}`],
                ['Costos Extras de Viajes', `Coordinadores, imprevistos, etc.`, `${formatCurrency(report.totalTourExtraCosts.ARS)} | ${formatCurrency(report.totalTourExtraCosts.USD, 'USD')}`],
                ...report.filteredData.customExpenses.map(e => ['Gasto Manual', e.description, formatCurrency(e.amount, e.currency)])
            ]
        });
        yPos = (doc as any).lastAutoTable.finalY + 10;

        doc.save(`Reporte_${monthKey}.pdf`);
    }

    setIsLoading(false);
  }

  const formatMonthKey = (monthKey: string) => {
    return toTitleCase(new Date(monthKey + '-02').toLocaleString('es-ES', { month: 'long', year: 'numeric' }));
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Historial de Reportes Mensuales</DialogTitle>
          <DialogDescription>
            Consulta y descarga reportes detallados en PDF de los meses finalizados.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-3 max-h-[60vh] overflow-y-auto">
          {archivedMonths.length > 0 ? (
            <Accordion type="multiple" className="w-full space-y-2">
            {archivedMonths.map(monthKey => {
                const report = calculateReportForMonth(monthKey);
                if (!report) return null;
                return (
                    <AccordionItem key={monthKey} value={monthKey} className="border rounded-lg">
                        <AccordionTrigger className="p-3 hover:no-underline font-semibold">
                            <div className="flex justify-between items-center w-full pr-2">
                                <span>{formatMonthKey(monthKey)}</span>
                                <Button size="sm" onClick={(e) => {e.stopPropagation(); generatePdf(monthKey)}} disabled={isLoading}>
                                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Download className="mr-2 h-4 w-4"/>}
                                    Descargar Mes
                                </Button>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="p-3 border-t bg-muted/30">
                           <div className="space-y-2">
                            {report.tripReports.map(({ tour, tourIncome, tourCommissions, hotelCost, transportCost, extrasCost, tourNetProfit }) => (
                                <Accordion key={tour.id} type="single" collapsible className="bg-background rounded-md border">
                                    <AccordionItem value={tour.id} className="border-b-0">
                                        <AccordionTrigger className="p-2 text-sm hover:no-underline">
                                             <div className="flex justify-between items-center w-full pr-2">
                                                <span>{tour.destination}</span>
                                                <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); generatePdf(monthKey, tour.id)}} disabled={isLoading}>
                                                    <Download className="mr-2 h-4 w-4"/>
                                                    Desglose
                                                </Button>
                                            </div>
                                        </AccordionTrigger>
                                        <AccordionContent className="p-3 border-t text-xs space-y-1">
                                            <p><strong>Ingresos:</strong> {formatCurrency(tourIncome.ARS)} | {formatCurrency(tourIncome.USD, 'USD')}</p>
                                            <p><strong>Gastos Totales:</strong> {formatCurrency(hotelCost.ARS + transportCost.ARS + extrasCost.ARS + tourCommissions.ARS)} | {formatCurrency(hotelCost.USD + transportCost.USD + extrasCost.USD + tourCommissions.USD, 'USD')}</p>
                                            <p className="font-bold"><strong>Ganancia Neta:</strong> {formatCurrency(tourNetProfit.ARS)} | {formatCurrency(tourNetProfit.USD, 'USD')}</p>
                                        </AccordionContent>
                                    </AccordionItem>
                                </Accordion>
                            ))}
                           </div>
                        </AccordionContent>
                    </AccordionItem>
                )
            })}
            </Accordion>
          ) : (
            <p className="text-center text-muted-foreground p-4">No hay reportes archivados disponibles.</p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
