import { prisma } from '@/lib/db';
import DashboardClient from '@/components/DashboardClient';
import { cookies } from 'next/headers';
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

  const { range, from, to, interval, campaignId: urlCampaignId } = params;
  const cookieCampaignId = cookieStore.get('activeCampaignId')?.value;

  let campaignId = 1;
  if (urlCampaignId) campaignId = parseInt(urlCampaignId);
  else if (cookieCampaignId) campaignId = parseInt(cookieCampaignId);

  const { start, end } = getDateRange(range || 'this_month', from, to);
  const currentInterval = interval || 'day';
  
  const now = new Date();
  const currentMonthStart = startOfMonth(now);
  const currentMonthEnd = getEndOfDay(endOfMonth(now));

  const allCampaigns = await prisma.campaign.findMany({ select: { id: true, name: true } });

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

  if (!campaign) return <div className="p-10 text-white">Geen campagne gevonden (ID {campaignId}).</div>;

  // --- BEREKENINGEN ---

  let totalSpend = 0;
  let googleSpend = 0;
  let microsoftSpend = 0;
  
  let totalLeads = 0;
  let totalSales = 0;
  let totalRevShare = 0; 

  // Map bevat nu ook leads & sales per dag
  const chartMap = new Map<string, { spend: number, revenue: number, leads: number, sales: number }>();

  // 1. Spend
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

  // 2. Revenue & Offers (Hier voegen we leads/sales per dag toe)
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

      // Chart Data vullen
      const key = getGroupKey(conv.date, currentInterval);
      const current = chartMap.get(key) || { spend: 0, revenue: 0, leads: 0, sales: 0 };
      
      chartMap.set(key, { 
          ...current, 
          revenue: current.revenue + rev,
          leads: current.leads + conv.leads, // <--- Dagelijkse leads
          sales: current.sales + conv.sales  // <--- Dagelijkse sales
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

  // 3. Adjustments
  campaign.adjustments.forEach(adj => {
    totalRevenue += adj.amount;
    totalRevShare += adj.amount;
    
    const key = getGroupKey(adj.date, currentInterval);
    const current = chartMap.get(key) || { spend: 0, revenue: 0, leads: 0, sales: 0 };
    chartMap.set(key, { ...current, revenue: current.revenue + adj.amount });
  });

  const profit = totalRevenue - totalSpend;
  const roi = totalSpend > 0 ? (profit / totalSpend) * 100 : 0;

  // Chart Data Array maken
  const chartData = Array.from(chartMap.entries())
    .map(([date, vals]) => ({
      date,
      spend: vals.spend,
      revenue: vals.revenue,
      leads: vals.leads, // <--- Doorsturen naar client
      sales: vals.sales, // <--- Doorsturen naar client
      profit: vals.revenue - vals.spend,
      roi: vals.spend > 0 ? ((vals.revenue - vals.spend) / vals.spend) * 100 : 0
    }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const topOffers = processedTopOffers
    .filter(o => o.revenue > 0)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

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