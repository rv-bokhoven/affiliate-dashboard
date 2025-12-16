import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// Helper voor datums (inclusief de nieuwe custom range support)
function getDateRange(range: string, customFrom?: string | null, customTo?: string | null) {
  const now = new Date();
  const start = new Date();
  const end = new Date();
  
  // Standaard einde is vandaag
  end.setHours(23, 59, 59, 999);
  start.setHours(0, 0, 0, 0);

  switch (range) {
    case 'custom':
      if (customFrom && customTo) {
        start.setTime(new Date(customFrom).getTime());
        end.setTime(new Date(customTo).getTime());
        end.setHours(23, 59, 59, 999);
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
      break;

    case 'this_week':
      const day = start.getDay() || 7; 
      if (day !== 1) start.setHours(-24 * (day - 1));
      break;

    case 'last_week':
      const cDay = start.getDay() || 7;
      start.setHours(-24 * (cDay - 1));
      start.setDate(start.getDate() - 7);
      end.setTime(start.getTime());
      end.setDate(end.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      break;

    case 'this_month':
      start.setDate(1);
      break;

    case 'this_year':
      start.setMonth(0, 1);
      break;

    default:
      // Fallback (bijv 'all' of ongeldig)
      return null;
  }
  return { start, end };
}

// HIER ZAT DE FOUT: Ik heb 'req' veranderd naar 'request'
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');
    const range = searchParams.get('range') || 'this_month';
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    if (!id) {
      return NextResponse.json({ error: "ID is verplicht" }, { status: 400 });
    }

    const offerId = parseInt(id);
    const dateFilter = getDateRange(range, from, to);

    // Bouw de query condition
    const whereCondition: any = { offerId: offerId };
    
    // Alleen filteren op datum als er een range is (bij 'all' is dateFilter null)
    if (dateFilter) {
      whereCondition.date = {
        gte: dateFilter.start,
        lte: dateFilter.end
      };
    }

    // Haal conversies op
    const conversions = await prisma.conversion.findMany({
      where: whereCondition,
      orderBy: { date: 'asc' }
    });

    // Haal offer details op
    const offer = await prisma.offer.findUnique({
      where: { id: offerId }
    });

    if (!offer) {
      return NextResponse.json({ error: "Offer niet gevonden" }, { status: 404 });
    }

    // Data transformeren voor de grafiek
    const chartData = conversions.map(c => ({
      date: c.date.toISOString().split('T')[0],
      leads: c.leads,
      sales: c.sales,
      revenue: (c.leads * offer.payoutLead) + (c.sales * offer.payoutSale)
    }));

    // Totalen berekenen
    const totals = chartData.reduce((acc, curr) => ({
      leads: acc.leads + curr.leads,
      sales: acc.sales + curr.sales,
      revenue: acc.revenue + curr.revenue
    }), { leads: 0, sales: 0, revenue: 0 });

    return NextResponse.json({ 
      offer, 
      chartData, 
      totals 
    });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}