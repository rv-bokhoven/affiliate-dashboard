import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { nl } from 'date-fns/locale';

// Helper: Bereken huidige én vorige periode (voor trends)
function getDateRanges(range: string, customFrom?: string | null, customTo?: string | null) {
  const now = new Date();
  const start = new Date();
  const end = new Date();
  
  // Standaard eindtijd: einde van vandaag
  end.setHours(23, 59, 59, 999);
  start.setHours(0, 0, 0, 0);

  // Vorige Periode (Initialiseren)
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
      start.setDate(1); 
      start.setMonth(start.getMonth() - 1);
      
      const endOfLastMonth = new Date(start);
      endOfLastMonth.setMonth(endOfLastMonth.getMonth() + 1);
      endOfLastMonth.setDate(0);
      
      end.setTime(endOfLastMonth.getTime());
      end.setHours(23, 59, 59, 999);

      prevStart.setTime(start.getTime());
      prevStart.setMonth(prevStart.getMonth() - 1);
      prevEnd.setTime(start.getTime());
      prevEnd.setDate(0);
      prevEnd.setHours(23, 59, 59, 999);
      break;

    case 'this_week':
      const day = start.getDay() || 7; 
      if (day !== 1) start.setHours(-24 * (day - 1));
      
      prevStart.setTime(start.getTime());
      prevStart.setDate(prevStart.getDate() - 7);
      prevEnd.setTime(prevStart.getTime());
      prevEnd.setDate(prevEnd.getDate() + 6);
      prevEnd.setHours(23, 59, 59, 999);
      break;

    case 'last_week':
      const currentDay = start.getDay() || 7;
      start.setHours(-24 * (currentDay - 1));
      start.setDate(start.getDate() - 7);
      end.setTime(start.getTime());
      end.setDate(end.getDate() + 6);
      end.setHours(23, 59, 59, 999);

      prevStart.setTime(start.getTime());
      prevStart.setDate(prevStart.getDate() - 7);
      prevEnd.setTime(prevStart.getTime());
      prevEnd.setDate(prevEnd.getDate() + 6);
      prevEnd.setHours(23, 59, 59, 999);
      break;

    case 'this_month':
      start.setDate(1);
      
      prevStart.setMonth(prevStart.getMonth() - 1);
      prevStart.setDate(1);
      prevEnd.setDate(0); 
      prevEnd.setHours(23, 59, 59, 999);
      break;

    case 'this_year':
      start.setMonth(0, 1);
      
      prevStart.setFullYear(prevStart.getFullYear() - 1);
      prevStart.setMonth(0, 1);
      prevEnd.setFullYear(prevEnd.getFullYear() - 1);
      prevEnd.setMonth(11, 31);
      prevEnd.setHours(23, 59, 59, 999);
      break;

    default:
      return null;
  }
  return { current: { start, end }, previous: { start: prevStart, end: prevEnd } };
}

async function getTotalsForRange(start: Date, end: Date) {
  const where = { date: { gte: start, lte: end } };
  
  const spends = await prisma.dailySpend.findMany({ where });
  const conversions = await prisma.conversion.findMany({ where, include: { offer: true } });

  const totalSpend = spends.reduce((acc, curr) => acc + curr.amount, 0);
  const totalRevenue = conversions.reduce((acc, curr) => 
    acc + (curr.leads * curr.offer.payoutLead) + (curr.sales * curr.offer.payoutSale), 0);
  const totalProfit = totalRevenue - totalSpend;
  
  return { spend: totalSpend, revenue: totalRevenue, profit: totalProfit };
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const range = searchParams.get('range') || 'this_month';
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    
    const dates = getDateRanges(range, from, to);

    if (!dates) {
       const spends = await prisma.dailySpend.findMany();
       const results = spends.map(s => ({...s, googleSpend:0, microsoftSpend:0, revenue:0, profit:0, roi:0})); 
       return NextResponse.json({ chartData: results, previousTotals: null });
    }

    const spends = await prisma.dailySpend.findMany({ 
      where: { date: { gte: dates.current.start, lte: dates.current.end } } 
    });
    const conversions = await prisma.conversion.findMany({
      where: { date: { gte: dates.current.start, lte: dates.current.end } },
      include: { offer: true },
    });

    const statsMap = new Map();
    const initDay = (date: string) => {
      if (!statsMap.has(date)) {
        statsMap.set(date, { date, spend: 0, googleSpend: 0, microsoftSpend: 0, revenue: 0, profit: 0, roi: 0 });
      }
      return statsMap.get(date);
    };

    spends.forEach((s) => {
      const entry = initDay(s.date.toISOString().split('T')[0]);
      entry.spend += s.amount;
      if (s.platform.toLowerCase().includes('google')) entry.googleSpend += s.amount;
      else if (s.platform.toLowerCase().includes('microsoft')) entry.microsoftSpend += s.amount;
    });

    conversions.forEach((c) => {
      const entry = initDay(c.date.toISOString().split('T')[0]);
      entry.revenue += (c.leads * c.offer.payoutLead + c.sales * c.offer.payoutSale);
    });

    const chartData = Array.from(statsMap.values()).map((e) => {
      e.profit = e.revenue - e.spend;
      e.roi = e.spend > 0 ? (e.profit / e.spend) * 100 : 0;
      
      e.spend = parseFloat(e.spend.toFixed(2));
      e.googleSpend = parseFloat(e.googleSpend.toFixed(2));
      e.microsoftSpend = parseFloat(e.microsoftSpend.toFixed(2));
      e.revenue = parseFloat(e.revenue.toFixed(2));
      e.profit = parseFloat(e.profit.toFixed(2));
      e.roi = parseFloat(e.roi.toFixed(1));

      return e;
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const previousTotals = await getTotalsForRange(dates.previous.start, dates.previous.end);

    return NextResponse.json({ chartData, previousTotals });
    
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Fout" }, { status: 500 });
  }
}