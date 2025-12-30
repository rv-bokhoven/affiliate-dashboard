import { prisma } from '@/lib/db';
import DashboardClient from '@/components/DashboardClient';
import { cookies } from 'next/headers';
import Link from 'next/link'; // <--- Importeer Link
import { 
  startOfMonth, endOfMonth, subMonths, 
  startOfWeek, endOfWeek, subWeeks, 
  startOfYear, endOfYear, 
  parseISO, format, 
  endOfDay as dateFnsEndOfDay
} from 'date-fns';

export const dynamic = 'force-dynamic';

function getEndOfDay(date: Date) { return dateFnsEndOfDay(date); }

function getDateRange(range: string, from?: string, to?: string) {
  const now = new Date();
  if (range === 'custom' && from && to) return { start: parseISO(from), end: getEndOfDay(parseISO(to)) };
  if (range === 'this_week') return { start: startOfWeek(now, { weekStartsOn: 1 }), end: getEndOfDay(endOfWeek(now, { weekStartsOn: 1 })) };
  if (range === 'last_week') { const lastWeek = subWeeks(now, 1); return { start: startOfWeek(lastWeek, { weekStartsOn: 1 }), end: getEndOfDay(endOfWeek(lastWeek, { weekStartsOn: 1 })) }; }
  if (range === 'last_month') { const lastMonth = subMonths(now, 1); return { start: startOfMonth(lastMonth), end: getEndOfDay(endOfMonth(lastMonth)) }; }
  if (range === 'this_year') return { start: startOfYear(now), end: getEndOfDay(endOfYear(now)) };
  if (range === 'all') return { start: new Date('2020-01-01'), end: getEndOfDay(now) };
  return { start: startOfMonth(now), end: getEndOfDay(endOfMonth(now)) };
}

function getGroupKey(date: Date, interval: string) {
  if (interval === 'month') return format(startOfMonth(date), 'yyyy-MM-dd');
  if (interval === 'week') return format(startOfWeek(date, { weekStartsOn: 1 }), 'yyyy-MM-dd');
  return format(date, 'yyyy-MM-dd');
}

export default async function Page({ 
  searchParams 
}: { 
  searchParams: Promise<{ [key: string]: string | undefined }> 
}) {
  const params = await searchParams;
  const cookieStore = await cookies();

  // 1. HAAL ALLE PROJECTEN OP (Lichtgewicht query)
  const allCampaigns = await prisma.campaign.findMany({ 
      select: { id: true, name: true },
      orderBy: { id: 'asc' }
  });

  // SCENARIO A: Helemaal geen projecten in de database
  if (allCampaigns.length === 0) {
      return (
          <div className="flex flex-col items-center justify-center h-[80vh] text-center p-4">
              <h1 className="text-2xl font-bold text-white mb-2">Welkom bij Affiliate Pro 🚀</h1>
              <p className="text-neutral-400 mb-6">Er zijn nog geen projecten gevonden.</p>
              <Link href="/settings" className="bg-white text-black px-6 py-2 rounded font-medium hover:bg-neutral-200 transition">
                  + Maak je eerste project aan
              </Link>
          </div>
      );
  }

  // 2. BEPAAL ACTIEVE ID
  let campaignId = 0;
  
  // A. Check URL
  if (params.campaignId) {
      campaignId = parseInt(params.campaignId);
  } 
  // B. Check Cookie
  else {
      const cookieId = cookieStore.get('activeCampaignId')?.value;
      if (cookieId) campaignId = parseInt(cookieId);
  }

  // C. Validatie: Bestaat dit ID wel? Zo niet, pak de eerste uit de lijst.
  const projectExists = allCampaigns.find(c => c.id === campaignId);
  if (!projectExists) {
      campaignId = allCampaigns[0].id;
      // We updaten de cookie niet server-side (is lastig in page.tsx), 
      // maar we gebruiken nu wel een geldig ID voor de data-fetch.
  }

  const { range, from, to, interval } = params;
  const { start, end } = getDateRange(range || 'this_month', from, to);
  const currentInterval = interval || 'day';
  
  const now = new Date();
  const currentMonthStart = startOfMonth(now);
  const currentMonthEnd = getEndOfDay(endOfMonth(now));

  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: {
      offers: {
        include: {
          network: true,
          conversions: { where: { date: { gte: start, lte: end } } }
        }
      },
      dailySpends: { where: { date: { gte: start, lte: end } } },
      adjustments: { where: { date: { gte: start, lte: end } } }
    }
  });

  if (!campaign) return <div className="p-10 text-white">Geen data geladen.</div>;

  // --- BEREKENINGEN (De rest is ongewijzigd) ---

  let totalSpend = 0;
  let googleSpend = 0;
  let microsoftSpend = 0;
  
  let totalLeads = 0;
  let totalSales = 0;
  let totalRevShare = 0; 

  const chartMap = new Map<string, { spend: number, revenue: number, leads: number, sales: number }>();

  campaign.dailySpends.forEach(spend => {
    const amountUSD = spend.currency === 'EUR' ? spend.amount * spend.exchangeRate : spend.amount;
    totalSpend += amountUSD;
    const p = spend.platform.toLowerCase();
    if (p.includes('google')) googleSpend += amountUSD;
    if (p.includes('microsoft') || p.includes('bing')) microsoftSpend += amountUSD;

    const key = getGroupKey(spend.date, currentInterval);
    const current = chartMap.get(key) || { spend: 0, revenue: 0, leads: 0, sales: 0 };
    chartMap.set(key, { ...current, spend: current.spend + amountUSD });
  });

  let totalRevenue = 0;
  
  const processedTopOffers = campaign.offers.map(offer => {
    let offerRevenue = 0;
    let leads = 0;
    let sales = 0;

    offer.conversions.forEach(conv => {
      const rev = (conv.leads * offer.payoutLead) + (conv.sales * offer.payoutSale);
      offerRevenue += rev;
      leads += conv.leads;
      sales += conv.sales;

      const key = getGroupKey(conv.date, currentInterval);
      const current = chartMap.get(key) || { spend: 0, revenue: 0, leads: 0, sales: 0 };
      
      chartMap.set(key, { 
          ...current, 
          revenue: current.revenue + rev,
          leads: current.leads + conv.leads, 
          sales: current.sales + conv.sales  
      });
    });

    totalLeads += leads;
    totalSales += sales;

    return {
      id: offer.id,
      name: offer.name,
      network: offer.network?.name || 'Unknown',
      leads,
      sales,
      revenue: offerRevenue
    };
  });

  totalRevenue = processedTopOffers.reduce((acc, curr) => acc + curr.revenue, 0);

  campaign.adjustments.forEach(adj => {
    totalRevenue += adj.amount;
    totalRevShare += adj.amount;
    
    const key = getGroupKey(adj.date, currentInterval);
    const current = chartMap.get(key) || { spend: 0, revenue: 0, leads: 0, sales: 0 };
    chartMap.set(key, { ...current, revenue: current.revenue + adj.amount });
  });

  const profit = totalRevenue - totalSpend;
  const roi = totalSpend > 0 ? (profit / totalSpend) * 100 : 0;

  const chartData = Array.from(chartMap.entries())
    .map(([date, vals]) => ({
      date,
      spend: vals.spend,
      revenue: vals.revenue,
      leads: vals.leads, 
      sales: vals.sales, 
      profit: vals.revenue - vals.spend,
      roi: vals.spend > 0 ? ((vals.revenue - vals.spend) / vals.spend) * 100 : 0
    }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const topOffers = processedTopOffers
    .filter(o => o.revenue > 0)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  const rawCapOffers = await prisma.offer.findMany({
    where: {
      campaignId: campaignId,
      status: 'ACTIVE', 
      OR: [ { capLeads: { not: null } }, { capRevenue: { not: null } } ]
    },
    include: {
      network: true,
      conversions: { where: { date: { gte: currentMonthStart, lte: currentMonthEnd } } }
    }
  });

  const capOffers = rawCapOffers.map(offer => {
    let currentRevenue = 0;
    let currentLeads = 0;
    offer.conversions.forEach(conv => {
      currentRevenue += (conv.leads * offer.payoutLead) + (conv.sales * offer.payoutSale);
      currentLeads += conv.leads;
    });
    return {
      id: offer.id,
      name: offer.name,
      network: offer.network?.name || 'Unknown',
      leads: currentLeads,
      sales: 0, 
      revenue: currentRevenue,
      capLeads: offer.capLeads,
      capRevenue: offer.capRevenue
    };
  }).sort((a, b) => {
    const getPercent = (o: any) => {
        if (o.capLeads) return o.leads / o.capLeads;
        if (o.capRevenue) return o.revenue / o.capRevenue;
        return 0;
    };
    return getPercent(b) - getPercent(a);
  });

  return (
    <DashboardClient 
      data={chartData}
      topOffers={topOffers}
      capOffers={capOffers}
      totals={{ 
        spend: totalSpend, revenue: totalRevenue, profit, roi, 
        googleSpend, microsoftSpend, leads: totalLeads, sales: totalSales, revShare: totalRevShare
      }}
      campaignName={campaign.name}
      campaignType={campaign.type || 'PAID'} 
    />
  );
}