
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
import { Button } from "@/components/ui/button"
import { Loader2, Download } from "lucide-react"
import type { Tour, Reservation, Seller, CommissionSettings, CustomExpense, ExternalCommission, ExcursionIncome, PaymentMethod } from "@/lib/types"
import { endOfMonth } from "date-fns"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import { toTitleCase } from "@/lib/utils"

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
    // Set 'now' to the start of today to correctly compare dates.
    now.setHours(0, 0, 0, 0);

    const relevantMonths = new Set<string>();

    // Only consider tours that have already passed
    allData.tours
      .filter(tour => new Date(tour.date) < now)
      .forEach(tour => {
        const monthKey = tour.date.toISOString().slice(0, 7); // YYYY-MM
        relevantMonths.add(monthKey);
    });
    
    return Array.from(relevantMonths)
        .sort((a, b) => b.localeCompare(a)) // Sort descending
        .slice(0, 12); // Show up to 12 past months
  }, [allData]);

  const calculateReportForMonth = (monthKey: string) => {
    if (!allData) return null;
    const from = new Date(monthKey + '-01T00:00:00');
    const to = endOfMonth(from);

    const filterByDate = <T extends { date: Date }>(items: T[]) => items.filter(item => item.date >= from && item.date <= to);
    
    const filteredData = {
        tours: allData.tours.filter(t => t.date >= from && t.date <= to),
        reservations: allData.reservations.filter(r => {
            const tour = allData.tours.find(t => t.id === r.tripId);
            return tour && tour.date >= from && tour.date <= to;
        }),
        customExpenses: filterByDate(allData.customExpenses),
        externalCommissions: filterByDate(allData.externalCommissions),
        excursionIncomes: filterByDate(allData.excursionIncomes),
    }

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
    const totalTourCosts = filteredData.tours.reduce((acc, tour) => {
        const costs = tour.costs || {};
        const hotelCost = { ...INITIAL_CURRENCY_TOTAL, [costs.hotel?.currency || 'ARS']: costs.hotel?.amount || 0 };
        const transportCost = (costs.transport || []).reduce((sum, c) => ({...sum, [c.currency || 'ARS']: (sum[c.currency || 'ARS'] || 0) + c.amount}), {...INITIAL_CURRENCY_TOTAL});
        const extrasCost = (costs.extras || []).reduce((sum, e) => ({...sum, [e.currency || 'ARS']: (sum[e.currency || 'ARS'] || 0) + e.amount}), {...INITIAL_CURRENCY_TOTAL});
        return addTotals(acc, addTotals(hotelCost, addTotals(transportCost, extrasCost)));
    }, { ...INITIAL_CURRENCY_TOTAL });
    const totalCustomExpenses = filteredData.customExpenses.reduce((acc, item) => ({ ...acc, [item.currency || 'ARS']: (acc[item.currency || 'ARS'] || 0) + item.amount }), { ...INITIAL_CURRENCY_TOTAL });
    const totalExpenses = [totalCommissionsPaid, totalTourCosts, totalCustomExpenses].reduce(addTotals, { ...INITIAL_CURRENCY_TOTAL });
    const netProfit = { ARS: totalIncome.ARS - totalExpenses.ARS, USD: totalIncome.USD - totalExpenses.USD };

    const tripReports = filteredData.tours.map(tour => {
        const tourReservations = allData.reservations.filter(r => r.tripId === tour.id);
        const incomeByMethod = tourReservations.reduce((acc, res) => {
            const paidInstallments = res.installments?.details.filter(i => i.isPaid) || [];
            paidInstallments.forEach(inst => {
                const method = inst.paymentMethod || 'Efectivo';
                if (!acc[method]) acc[method] = {...INITIAL_CURRENCY_TOTAL};
                acc[method] = { ...acc[method], [tour.currency || 'ARS']: (acc[method][tour.currency || 'ARS'] || 0) + inst.amount };
            });
            return acc;
        }, {} as Record<PaymentMethod, CurrencyTotal>);
        const tourIncome = Object.values(incomeByMethod).reduce(addTotals, {...INITIAL_CURRENCY_TOTAL});
        const tourCommissions = tourReservations.reduce((acc, res) => addTotals(acc, calculateCommission(res)), { ...INITIAL_CURRENCY_TOTAL });
        const costs = tour.costs || {};
        const hotelCost = { ...INITIAL_CURRENCY_TOTAL, [costs.hotel?.currency || 'ARS']: costs.hotel?.amount || 0 };
        const transportCost = (costs.transport || []).reduce((sum, c) => ({...sum, [c.currency || 'ARS']: (sum[c.currency || 'ARS'] || 0) + c.amount}), {...INITIAL_CURRENCY_TOTAL});
        const extrasCost = (costs.extras || []).reduce((sum, e) => ({...sum, [e.currency || 'ARS']: (sum[e.currency || 'ARS'] || 0) + e.amount}), {...INITIAL_CURRENCY_TOTAL});
        const totalFixedCosts = addTotals(hotelCost, addTotals(transportCost, extrasCost));
        const netProfit = { ARS: tourIncome.ARS - totalFixedCosts.ARS - tourCommissions.ARS, USD: tourIncome.USD - totalFixedCosts.USD - tourCommissions.USD };
        return { tour, totalIncome: tourIncome, incomeByMethod, totalFixedCosts, totalCommission: tourCommissions, netProfit };
    });

    return { totalIncome, totalExpenses, netProfit, tripReports, filteredData };
  }

  const generateAndDownloadPdf = async (monthKey: string) => {
    setIsLoading(true);
    const report = calculateReportForMonth(monthKey);
    if (!report) {
        setIsLoading(false);
        return;
    }
    const { totalIncome, totalExpenses, netProfit, tripReports, filteredData } = report;
    const monthName = toTitleCase(new Date(monthKey + '-02').toLocaleString('es-ES', { month: 'long', year: 'numeric' }));

    const doc = new jsPDF();
    let yPos = 20;

    const addText = (text: string, x: number, y: number, options: any) => {
        doc.text(text, x, y, options);
    };

    // Header
    addText(`Reporte Mensual: ${monthName}`, 105, yPos, { align: 'center' });
    yPos += 10;
    
    // Summary
    autoTable(doc, {
        startY: yPos,
        head: [['Resumen del Mes', 'ARS', 'USD']],
        body: [
            ['Ingresos Totales', formatCurrency(totalIncome.ARS), formatCurrency(totalIncome.USD, 'USD')],
            ['Gastos Totales', formatCurrency(totalExpenses.ARS, 'ARS'), formatCurrency(totalExpenses.USD, 'USD')],
            ['Ganancia Neta', formatCurrency(netProfit.ARS, 'ARS'), formatCurrency(netProfit.USD, 'USD')]
        ],
        theme: 'grid',
        headStyles: { fillColor: [74, 85, 104] }
    });
    yPos = (doc as any).lastAutoTable.finalY + 10;
    
    // Trips
    addText('Desglose por Viaje', 14, yPos);
    yPos += 5;
    
    tripReports.forEach(report => {
        const body = [
            ['Ingreso por Tarjeta', formatCurrency(report.incomeByMethod['Tarjeta']?.ARS || 0), formatCurrency(report.incomeByMethod['Tarjeta']?.USD || 0, 'USD')],
            ['Ingreso por Transferencia', formatCurrency(report.incomeByMethod['Transferencia']?.ARS || 0), formatCurrency(report.incomeByMethod['Transferencia']?.USD || 0, 'USD')],
            ['Ingreso por Efectivo', formatCurrency(report.incomeByMethod['Efectivo']?.ARS || 0), formatCurrency(report.incomeByMethod['Efectivo']?.USD || 0, 'USD')],
            ['Costos Fijos', formatCurrency(report.totalFixedCosts.ARS), formatCurrency(report.totalFixedCosts.USD, 'USD')],
            ['Comisiones', formatCurrency(report.totalCommission.ARS), formatCurrency(report.totalCommission.USD, 'USD')],
            [{ content: 'Ganancia Neta del Viaje', styles: { fontStyle: 'bold' } }, { content: formatCurrency(report.netProfit.ARS), styles: { fontStyle: 'bold' } }, { content: formatCurrency(report.netProfit.USD, 'USD'), styles: { fontStyle: 'bold' } }]
        ];

        autoTable(doc, {
            startY: yPos,
            head: [[{ content: `Viaje: ${report.tour.destination}`, colSpan: 3, styles: { fillColor: [45, 55, 72] } }]],
            body: body,
            theme: 'striped',
        });
        yPos = (doc as any).lastAutoTable.finalY + 10;
    });
    
    // Detailed Lists
    if (yPos > 250) doc.addPage();
    if(filteredData.excursionIncomes.length > 0) {
        addText('Ingresos por Excursiones', 14, yPos); yPos += 5;
        autoTable(doc, { startY: yPos, head: [['Descripción', 'Monto']], body: filteredData.excursionIncomes.map(i => [i.description, formatCurrency(i.amount, i.currency)]) });
        yPos = (doc as any).lastAutoTable.finalY + 10;
    }

    if (filteredData.externalCommissions.length > 0) {
        if (yPos > 250) doc.addPage();
        addText('Ingresos por Comisiones Externas', 14, yPos); yPos += 5;
        autoTable(doc, { startY: yPos, head: [['Descripción', 'Monto']], body: filteredData.externalCommissions.map(i => [i.description, formatCurrency(i.amount, i.currency)]) });
        yPos = (doc as any).lastAutoTable.finalY + 10;
    }

    if (filteredData.customExpenses.length > 0) {
        if (yPos > 250) doc.addPage();
        addText('Gastos Manuales', 14, yPos); yPos += 5;
        autoTable(doc, { startY: yPos, head: [['Descripción', 'Monto']], body: filteredData.customExpenses.map(i => [i.description, formatCurrency(i.amount, i.currency)]) });
    }

    doc.save(`Reporte_${monthKey}.pdf`);
    setIsLoading(false);
  }

  const formatMonthKey = (monthKey: string) => {
    return toTitleCase(new Date(monthKey + '-02').toLocaleString('es-ES', { month: 'long', year: 'numeric' }));
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Historial de Reportes Mensuales</DialogTitle>
          <DialogDescription>
            Descarga reportes detallados en PDF de los meses finalizados. Se muestran los últimos 12 meses con actividad.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-3">
          {archivedMonths.length > 0 ? (
            archivedMonths.map(monthKey => (
              <div key={monthKey} className="flex items-center justify-between p-3 border rounded-lg bg-muted/50">
                <span className="font-medium">{formatMonthKey(monthKey)}</span>
                <Button size="sm" onClick={() => generateAndDownloadPdf(monthKey)} disabled={isLoading}>
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Download className="mr-2 h-4 w-4"/>}
                    Descargar Reporte
                </Button>
              </div>
            ))
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
