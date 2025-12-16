// app/api/stats/top-offers/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// Dezelfde datum-helper als in je main stats API (om code te hergebruiken zou je dit in een los bestand kunnen zetten, maar voor nu kopiëren we het even)
function getDateRange(range: string, customFrom?: string | null, customTo?: string | null) {
  const now = new Date();
  const start = new Date();
  const end = new Date();
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
    case 'last_month': // NIEUW
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
      const currentDay = start.getDay() || 7;
      start.setHours(-24 * (currentDay - 1));
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
    case 'all':
    default:
      return null;
  }
  return { start, end };
}

export async function GET(request: NextRequest) {
  try {
      const searchParams = request.nextUrl.searchParams;
      const range = searchParams.get('range') || 'this_month';
      const from = searchParams.get('from');
      const to = searchParams.get('to');
  
  const dateFilter = getDateRange(range, from, to);

    const whereClause = dateFilter ? {
      date: { gte: dateFilter.start, lte: dateFilter.end }
    } : {};

    // Haal alle conversies op binnen de datum range
    const conversions = await prisma.conversion.findMany({
      where: whereClause,
      include: { offer: true },
    });

    // Groepeer per Offer
    const offerStats = new Map();

    conversions.forEach((c) => {
      if (!offerStats.has(c.offerId)) {
        offerStats.set(c.offerId, {
          id: c.offerId,
          name: c.offer.name,
          network: c.offer.network,
          capLeads: c.offer.capLeads,       // <--- TOEVOEGEN
          capRevenue: c.offer.capRevenue,   // <--- TOEVOEGEN
          leads: 0,
          sales: 0,
          revenue: 0,
        });
      }

      const stats = offerStats.get(c.offerId);
      stats.leads += c.leads;
      stats.sales += c.sales;
      stats.revenue += (c.leads * c.offer.payoutLead) + (c.sales * c.offer.payoutSale);
    });

    // Omzetten naar array en sorteren op Revenue (Hoog naar laag)
    const sortedOffers = Array.from(offerStats.values())
      .sort((a, b) => b.revenue - a.revenue)
      .map(o => ({
        ...o,
        revenue: parseFloat(o.revenue.toFixed(2))
      }));

    return NextResponse.json(sortedOffers);

  } catch (error) {
    return NextResponse.json({ error: "Fout bij ophalen top offers" }, { status: 500 });
  }
}