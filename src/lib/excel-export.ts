
import * as XLSX from 'xlsx';
import type { Bubble } from '@/hooks/use-calendar-bubbles';

const tailwindToHex: Record<string, string> = {
  "bg-blue-200": "BFDBFE",
  "bg-green-200": "BBF7D0",
  "bg-yellow-200": "FEF08A",
  "bg-red-200": "FECACA",
  "bg-purple-200": "E9D5FF",
  "bg-pink-200": "FBCFE8",
};

export const exportToExcel = (currentDate: Date, bubbles: Bubble[]) => {
  const monthName = currentDate.toLocaleString('es-ES', { month: 'long', year: 'numeric' });
  const ws_name = monthName.charAt(0).toUpperCase() + monthName.slice(1);

  const weekdays = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
  const headerData = [weekdays];
  const ws = XLSX.utils.aoa_to_sheet(headerData);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDayOfMonth = new Date(year, month, 1);
  const startDateGrid = new Date(firstDayOfMonth);
  startDateGrid.setDate(startDateGrid.getDate() - startDateGrid.getDay());

  const cellData: Record<string, { text: string[], colors: string[] }> = {};
  const borderStyle = { style: 'thin', color: { rgb: "000000" } };
  const cellBorders = { top: borderStyle, bottom: borderStyle, left: borderStyle, right: borderStyle };

  for (let i = 0; i < 42; i++) {
    const currentDay = new Date(startDateGrid);
    currentDay.setDate(startDateGrid.getDate() + i);
    const dayKey = currentDay.toISOString().split('T')[0];

    if (currentDay.getMonth() === month) {
      cellData[dayKey] = { text: [String(currentDay.getDate())], colors: [] };
    }
  }

  bubbles.forEach(bubble => {
    const dates = bubble.dates.sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
    const colorClass = bubble.color?.split(' ')[0] || '';
    const hexColor = tailwindToHex[colorClass] || "FFFFFF";

    dates.forEach(dateStr => {
      const date = new Date(dateStr + "T00:00:00");
      if (date.getMonth() !== month) return;

      if (!cellData[dateStr]) cellData[dateStr] = { text: [String(date.getDate())], colors: [] };
      cellData[dateStr].text.push(bubble.text);
      cellData[dateStr].colors.push(hexColor);
    });
  });

  for (let i = 0; i < 42; i++) {
    const currentDay = new Date(startDateGrid);
    currentDay.setDate(startDateGrid.getDate() + i);
    const dayKey = currentDay.toISOString().split('T')[0];
    const data = cellData[dayKey];
    
    const r = Math.floor(i / 7) + 1;
    const c = i % 7;
    const cellRef = XLSX.utils.encode_cell({ r, c });

    if (data) {
      const mainColor = data.colors[0]; 
      ws[cellRef] = {
        v: data.text.join('\n'),
        t: 's',
        s: {
          font: { sz: 10, color: { rgb: "000000" } },
          alignment: { vertical: "top", horizontal: "left", wrapText: true },
          border: cellBorders,
          ...(mainColor && { fill: { fgColor: { rgb: mainColor } } })
        }
      };
    } else {
       ws[cellRef] = { v: '', t: 's', s: { border: cellBorders } };
    }
  }

  weekdays.forEach((_, c) => {
      const headerRef = XLSX.utils.encode_cell({ r: 0, c });
      ws[headerRef].s = {
          font: { bold: true, sz: 12, color: { rgb: "FFFFFF" }},
          fill: { fgColor: { rgb: "4A5568" }},
          alignment: { horizontal: "center", vertical: "center" },
          border: cellBorders
      }
  });

  ws['!cols'] = weekdays.map(() => ({ wch: 25 }));
  ws['!rows'] = Array(7).fill({ hpx: 80 });
  if (ws['!rows'][0]) ws['!rows'][0].hpx = 25;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, ws_name);

  XLSX.writeFile(wb, `Calendario_${ws_name.replace(/ /g, '_')}.xlsx`);
};
