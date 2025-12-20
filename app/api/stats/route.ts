import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';


// Helper: Bereken de "startdatum" van het bakje (Dag, Week of Maand)
// app/api/stats/route.ts

// Helper: Bereken de "startdatum" van het bakje (Dag, Week of Maand)
function getGroupKey(date: Date, interval: string): string {
  // TIMEZONE FIX 2.0 (De definitieve oplossing):
  // We vragen de server: "Welke datum is dit in Amsterdam?"
  // 'en-CA' zorgt voor het formaat YYYY-MM-DD.
  const dutchDateString = new Date(date).toLocaleDateString('en-CA', {
    timeZone: 'Europe/Amsterdam'
  });

  // dutchDateString is nu keihard "2023-12-20", zelfs als de database "19 dec 23:00" zegt.
  const d = new Date(dutchDateString); // Dit wordt 20 dec 00:00 UTC. Perfect.

  if (interval === 'month') {
    d.setDate(1); // Zet op de 1e van de maand
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}-01`;
  }

  if (interval === 'week') {
    const day = d.getDay() || 7; // Maak zondag (0) een 7
    if (day !== 1) d.setHours(-24 * (day - 1)); // Ga terug naar maandag
    return d.toISOString().split('T')[0];
  }

  // Default: Dag (Gebruik direct de Amsterdamse string)
  return dutchDateString;
}

// Helper: Bereken datum ranges (deze had je al, is ongewijzigd)
function getDateRanges(range: string, customFrom?: string | null, customTo?: string | null) {
  const now = new Date();
  const start = new Date();
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  start.setHours(0, 0, 0, 0);

  const prevStart = new Date(start);
  const prevEnd = new Date(end);

  switch (range) {
    case 'custom':
      if (customFrom && customTo) {
        start.setTime(new Date(customFrom).getTime());
        end.setTime(new Date(customTo).getTime());
        end.setHours(23, 59, 59, 999);
        start.setHours(0, 0, 0, 0);
        const diff = end.getTime() - start.getTime();
        prevEnd.setTime(start.getTime() - 1);
        prevStart.setTime(prevEnd.getTime() - diff);
      }
      break;
    case 'last_month':
      start.setDate(1); start.setMonth(start.getMonth() - 1);
      const endOfLastMonth = new Date(start);
      endOfLastMonth.setMonth(endOfLastMonth.getMonth() + 1); endOfLastMonth.setDate(0);
      end.setTime(endOfLastMonth.getTime()); end.setHours(23, 59, 59, 999);
      prevStart.setTime(start.getTime()); prevStart.setMonth(prevStart.getMonth() - 1);
      prevEnd.setTime(start.getTime()); prevEnd.setDate(0); prevEnd.setHours(23, 59, 59, 999);
      break;
    case 'this_week':
      const day = start.getDay() || 7; 
      if (day !== 1) start.setHours(-24 * (day - 1));
      prevStart.setTime(start.getTime()); prevStart.setDate(prevStart.getDate() - 7);
      prevEnd.setTime(prevStart.getTime()); prevEnd.setDate(prevEnd.getDate() + 6); prevEnd.setHours(23, 59, 59, 999);
      break;
    case 'last_week':
      const currentDay = start.getDay() || 7;
      start.setHours(-24 * (currentDay - 1)); start.setDate(start.getDate() - 7);
      end.setTime(start.getTime()); end.setDate(end.getDate() + 6); end.setHours(23, 59, 59, 999);
      prevStart.setTime(start.getTime()); prevStart.setDate(prevStart.getDate() - 7);
      prevEnd.setTime(prevStart.getTime()); prevEnd.setDate(prevEnd.getDate() + 6); prevEnd.setHours(23, 59, 59, 999);
      break;
    case 'this_month':
      start.setDate(1);
      prevStart.setMonth(prevStart.getMonth() - 1); prevStart.setDate(1);
      prevEnd.setDate(0); prevEnd.setHours(23, 59, 59, 999);
      break;
    case 'this_year':
      start.setMonth(0, 1);
      prevStart.setFullYear(prevStart.getFullYear() - 1); prevStart.setMonth(0, 1);
      prevEnd.setFullYear(prevEnd.getFullYear() - 1); prevEnd.setMonth(11, 31); prevEnd.setHours(23, 59, 59, 999);
      break;
    case 'all':
      start.setFullYear(2020, 0, 1); start.setHours(0, 0, 0, 0);
      prevStart.setFullYear(1990, 0, 1); prevEnd.setFullYear(1990, 12, 31);
      break;
    default:
      start.setDate(1); break;
  }
  return { current: { start, end }, previous: { start: prevStart, end: prevEnd } };
}

async function getTotalsForRange(start: Date, end: Date) {
  const where = { date: { gte: start, lte: end } };
  const spends = await prisma.dailySpend.findMany({ where });
  const conversions = await prisma.conversion.findMany({ where, include: { offer: true } });
  const totalSpend = spends.reduce((acc, curr) => acc + curr.amount, 0);
  const totalRevenue = conversions.reduce((acc, curr) => acc + (curr.leads * curr.offer.payoutLead) + (curr.sales * curr.offer.payoutSale), 0);
  return { spend: totalSpend, revenue: totalRevenue, profit: totalRevenue - totalSpend };
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const range = searchParams.get('range') || 'this_month';
    const interval = searchParams.get('interval') || 'day'; // <--- NIEUW: Interval ophalen
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    
    const dates = getDateRanges(range, from, to);

    const spends = await prisma.dailySpend.findMany({ 
      where: { date: { gte: dates.current.start, lte: dates.current.end } } 
    });
    const conversions = await prisma.conversion.findMany({
      where: { date: { gte: dates.current.start, lte: dates.current.end } },
      include: { offer: true },
    });

    const statsMap = new Map();
    const initEntry = (dateKey: string) => {
      if (!statsMap.has(dateKey)) {
        statsMap.set(dateKey, { date: dateKey, spend: 0, googleSpend: 0, microsoftSpend: 0, revenue: 0, profit: 0, roi: 0 });
      }
      return statsMap.get(dateKey);
    };

    // Data verwerken met de nieuwe interval functie
    spends.forEach((s) => {
      const key = getGroupKey(s.date, interval); // <--- HIER GEBRUIKEN WE DE INTERVAL
      const entry = initEntry(key);
      entry.spend += s.amount;
      if (s.platform.toLowerCase().includes('google')) entry.googleSpend += s.amount;
      else if (s.platform.toLowerCase().includes('microsoft')) entry.microsoftSpend += s.amount;
    });

    conversions.forEach((c) => {
      const key = getGroupKey(c.date, interval); // <--- HIER OOK
      const entry = initEntry(key);
      entry.revenue += (c.leads * c.offer.payoutLead + c.sales * c.offer.payoutSale);
    });

    const chartData = Array.from(statsMap.values()).map((e) => {
      e.profit = e.revenue - e.spend;
      e.roi = e.spend > 0 ? (e.profit / e.spend) * 100 : 0;
      
      // Afronden
      e.spend = parseFloat(e.spend.toFixed(2));
      e.googleSpend = parseFloat(e.googleSpend.toFixed(2));
      e.microsoftSpend = parseFloat(e.microsoftSpend.toFixed(2));
      e.revenue = parseFloat(e.revenue.toFixed(2));
      e.profit = parseFloat(e.profit.toFixed(2));
      e.roi = parseFloat(e.roi.toFixed(1));

      return e;
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let previousTotals = null;
    if (range !== 'all') {
      previousTotals = await getTotalsForRange(dates.previous.start, dates.previous.end);
    }

    return NextResponse.json({ chartData, previousTotals });
    
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Fout" }, { status: 500 });
  }
}