import { prisma } from '@/lib/db';
import TrafficClient from '@/components/TrafficClient';
import { cookies } from 'next/headers';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { 
  startOfMonth, endOfMonth, subMonths, 
  startOfWeek, endOfWeek, subWeeks, 
  startOfYear, endOfYear, 
  parseISO, format, 
  endOfDay as dateFnsEndOfDay,
  subDays, startOfDay
} from 'date-fns';

export const dynamic = 'force-dynamic';

const EUR_USD_RATE = 1.17; 

function getEndOfDay(date: Date) { return dateFnsEndOfDay(date); }

function getDateRange(range: string, from?: string, to?: string) {
  const now = new Date();
  if (range === 'custom' && from && to) return { start: parseISO(from), end: getEndOfDay(parseISO(to)) };
  if (range === 'yesterday') {
      const yesterday = subDays(now, 1);
      return { start: startOfDay(yesterday), end: getEndOfDay(yesterday) };
  }
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

export default async function TrafficPage({ 
  searchParams 
}: { 
  searchParams: Promise<{ [key: string]: string | undefined }> 
}) {
  const params = await searchParams;
  const cookieStore = await cookies();
  const session: any = await getSession();

  if (!session) redirect('/login');

  // 1. Instellingen & Valuta
  const displayCurrency = params.currency === 'EUR' ? 'EUR' : 'USD';
  const currencySymbol = displayCurrency === 'EUR' ? '€' : '$';

  const convert = (amount: number, itemCurrency: string, itemRate: number) => {
    const amountInUSD = itemCurrency === 'EUR' ? amount * itemRate : amount;
    if (displayCurrency === 'USD') return amountInUSD;
    if (displayCurrency === 'EUR') return amountInUSD / EUR_USD_RATE;
    return amountInUSD;
  };

  // 2. Project Toegang
  let allowedCampaigns = [];
  if (session.role === 'SUPER_ADMIN') {
      allowedCampaigns = await prisma.campaign.findMany({ select: { id: true, name: true }, orderBy: { id: 'asc' } });
  } else {
      allowedCampaigns = await prisma.campaign.findMany({ 
          where: { members: { some: { userId: session.userId } } },
          select: { id: true, name: true },
          orderBy: { id: 'asc' }
      });
  }

  if (allowedCampaigns.length === 0) return <div className="text-white p-10">Geen toegang tot projecten.</div>;

  // 3. Bepaal ID
  let requestedId = params.campaignId ? parseInt(params.campaignId) : (cookieStore.get('activeCampaignId')?.value ? parseInt(cookieStore.get('activeCampaignId')!.value) : 0);
  const hasAccess = allowedCampaigns.find(c => c.id === requestedId);
  const campaignId = hasAccess ? requestedId : allowedCampaigns[0].id;

  // 4. Data Ophalen
  const { range, from, to, interval } = params;
  const { start, end } = getDateRange(range || 'yesterday', from, to);
  const currentInterval = interval || 'day';

  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: {
      dailySpends: { where: { date: { gte: start, lte: end } } },
      // We halen offers/adjustments alleen op om de TOTALE revenue te berekenen voor de EPC
      offers: {
        include: { conversions: { where: { date: { gte: start, lte: end } } } }
      },
      adjustments: { where: { date: { gte: start, lte: end } } }
    }
  });

  if (!campaign) return <div className="text-white p-10">Campaign not found</div>;

  // --- DATA VERWERKING ---

  // A. Total Revenue berekenen (voor globale EPC)
  let totalRevenue = 0;
  
  // Revenue uit Offers
  campaign.offers.forEach(offer => {
    const offerCurrency = offer.currency || 'USD';
    const offerRate = offerCurrency === 'EUR' ? EUR_USD_RATE : 1.0;
    const payoutLead = convert(offer.payoutLead, offerCurrency, offerRate);
    const payoutSale = convert(offer.payoutSale, offerCurrency, offerRate);

    offer.conversions.forEach(c => {
        totalRevenue += (c.leads * payoutLead) + (c.sales * payoutSale);
    });
  });

  // Revenue uit Adjustments
  campaign.adjustments.forEach(adj => {
      totalRevenue += convert(adj.amount, adj.currency, adj.exchangeRate);
  });

  // B. Traffic Data per Platform & Grafiek
  let totalSpend = 0;
  let totalClicks = 0;

  const platformStats = {
      google: { clicks: 0, spend: 0 },
      microsoft: { clicks: 0, spend: 0 }
  };

  const chartMap = new Map<string, { googleClicks: number, microsoftClicks: number, avgCpc: number, totalSpend: number, totalClicks: number }>();

  campaign.dailySpends.forEach(spend => {
      const value = convert(spend.amount, spend.currency, spend.exchangeRate);
      const clicks = spend.clicks || 0;
      
      totalSpend += value;
      totalClicks += clicks;

      // Platform Split
      const p = spend.platform.toLowerCase();
      if (p.includes('google')) {
          platformStats.google.spend += value;
          platformStats.google.clicks += clicks;
      } else if (p.includes('microsoft') || p.includes('bing')) {
          platformStats.microsoft.spend += value;
          platformStats.microsoft.clicks += clicks;
      }

      // Chart Data vullen
      const key = getGroupKey(spend.date, currentInterval);
      const current = chartMap.get(key) || { googleClicks: 0, microsoftClicks: 0, avgCpc: 0, totalSpend: 0, totalClicks: 0 };
      
      const isGoogle = p.includes('google');
      const isMicrosoft = p.includes('microsoft') || p.includes('bing');

      chartMap.set(key, {
          ...current,
          googleClicks: current.googleClicks + (isGoogle ? clicks : 0),
          microsoftClicks: current.microsoftClicks + (isMicrosoft ? clicks : 0),
          totalSpend: current.totalSpend + value,
          totalClicks: current.totalClicks + clicks
      });
  });

  // Chart data afronden (CPC berekenen per dag)
  const chartData = Array.from(chartMap.entries()).map(([date, vals]) => ({
      date,
      googleClicks: vals.googleClicks,
      microsoftClicks: vals.microsoftClicks,
      totalClicks: vals.totalClicks,
      avgCpc: vals.totalClicks > 0 ? vals.totalSpend / vals.totalClicks : 0
  })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return (
    <TrafficClient 
      data={chartData}
      platforms={platformStats}
      totals={{
          clicks: totalClicks,
          spend: totalSpend,
          revenue: totalRevenue // Nodig voor EPC
      }}
      campaignName={campaign.name}
      currencySymbol={currencySymbol}
      currentCurrency={displayCurrency}
    />
  );
}