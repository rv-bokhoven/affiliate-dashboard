import { prisma } from '@/lib/db';
import DashboardClient from '@/components/DashboardClient';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { 
  startOfMonth, endOfMonth, subMonths, 
  startOfWeek, endOfWeek, subWeeks, 
  startOfYear, endOfYear, 
  parseISO, format, 
  endOfDay as dateFnsEndOfDay
} from 'date-fns';

export const dynamic = 'force-dynamic';

// CONFIGURATIE: Wisselkoers voor weergave
const EUR_USD_RATE = 1.17; // 1 Euro = 1.05 Dollar

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
  const session: any = await getSession();

  if (!session) redirect('/login');

  // 1. BEPAAL VALUTA WEERGAVE
  // Kijkt naar ?currency=EUR in de URL, anders standaard USD
  const displayCurrency = params.currency === 'EUR' ? 'EUR' : 'USD';
  const currencySymbol = displayCurrency === 'EUR' ? '€' : '$';

  // HULPFUNCTIE: Converteer bedragen
  const convert = (amount: number, itemCurrency: string, itemRate: number) => {
    // Stap 1: Alles omrekenen naar USD (Onze basis)
    // Als item EUR is (rate 1.05), dan is 100 EUR -> 105 USD.
    // Bij USD is de rate genegeerd of 1.0
    const amountInUSD = itemCurrency === 'EUR' ? amount * itemRate : amount;

    // Stap 2: Van USD naar de gewenste Weergave Valuta
    if (displayCurrency === 'USD') return amountInUSD;
    if (displayCurrency === 'EUR') return amountInUSD / EUR_USD_RATE;
    
    return amountInUSD;
  };

  // 2. BEPAAL PROJECT TOEGANG (Ongewijzigd)
  let allowedCampaigns: { id: number; name: string }[] = [];

  if (session.role === 'SUPER_ADMIN') {
      allowedCampaigns = await prisma.campaign.findMany({ 
          select: { id: true, name: true },
          orderBy: { id: 'asc' }
      });
  } else {
      allowedCampaigns = await prisma.campaign.findMany({ 
          where: {
            members: { some: { userId: session.userId } }
          },
          select: { id: true, name: true },
          orderBy: { id: 'asc' }
      });
  }

  if (allowedCampaigns.length === 0) {
      return (
          <div className="flex flex-col items-center justify-center h-[80vh] text-center p-4">
              <h1 className="text-2xl font-bold text-white mb-2">Welkom bij Affiliate Pro 🚀</h1>
              <p className="text-neutral-400 mb-6">Je bent nog niet gekoppeld aan een project.</p>
              {session.role === 'SUPER_ADMIN' && (
                  <Link href="/settings" className="bg-white text-black px-6 py-2 rounded font-medium hover:bg-neutral-200 transition">
                      + Maak je eerste project aan
                  </Link>
              )}
          </div>
      );
  }

  // 3. BEPAAL HET GEWENSTE ID
  let requestedId = 0;
  if (params.campaignId) {
      requestedId = parseInt(params.campaignId);
  } else {
      const cookieId = cookieStore.get('activeCampaignId')?.value;
      if (cookieId) requestedId = parseInt(cookieId);
  }

  const hasAccess = allowedCampaigns.find(c => c.id === requestedId);
  const campaignId = hasAccess ? requestedId : allowedCampaigns[0].id;

  // --- DATA OPHALEN ---

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

  // --- BEREKENINGEN (Aangepast met convert functie) ---

  let totalSpend = 0;
  let googleSpend = 0;
  let microsoftSpend = 0;
  
  let totalLeads = 0;
  let totalSales = 0;
  let totalRevShare = 0; 
  let totalRevenue = 0; // Deze initialiseren we nu hier

  const chartMap = new Map<string, { spend: number, revenue: number, leads: number, sales: number }>();

  // 1. Verwerk SPEND
  campaign.dailySpends.forEach(spend => {
    // AANGEPAST: Gebruik convert()
    const value = convert(spend.amount, spend.currency, spend.exchangeRate);
    
    totalSpend += value;
    const p = spend.platform.toLowerCase();
    if (p.includes('google')) googleSpend += value;
    if (p.includes('microsoft') || p.includes('bing')) microsoftSpend += value;

    const key = getGroupKey(spend.date, currentInterval);
    const current = chartMap.get(key) || { spend: 0, revenue: 0, leads: 0, sales: 0 };
    chartMap.set(key, { ...current, spend: current.spend + value });
  });

  
  // 2. Verwerk OFFERS
  const processedTopOffers = campaign.offers.map(offer => {
    let offerRevenue = 0;
    
    // AANGEPAST: Reken payouts om naar de weergave valuta
    // We gaan ervan uit dat offer payouts in de DB in USD staan (rate 1.0)
    const payoutLeadConv = convert(offer.payoutLead, 'USD', 1.0);
    const payoutSaleConv = convert(offer.payoutSale, 'USD', 1.0);

    let leads = 0;
    let sales = 0;

    offer.conversions.forEach(conv => {
      const rev = (conv.leads * payoutLeadConv) + (conv.sales * payoutSaleConv);
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

  // 3. Verwerk ADJUSTMENTS / REVSHARE
  campaign.adjustments.forEach(adj => {
    // AANGEPAST: Gebruik convert() voor de juiste valuta
    const value = convert(adj.amount, adj.currency, adj.exchangeRate);

    totalRevenue += value;
    totalRevShare += value;
    
    const key = getGroupKey(adj.date, currentInterval);
    const current = chartMap.get(key) || { spend: 0, revenue: 0, leads: 0, sales: 0 };
    chartMap.set(key, { ...current, revenue: current.revenue + value });
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
    // Voor caps (limieten) hoeven we meestal niet om te rekenen voor het percentage, 
    // maar voor de revenue weergave wel.
    const payoutLeadConv = convert(offer.payoutLead, 'USD', 1.0);
    const payoutSaleConv = convert(offer.payoutSale, 'USD', 1.0);

    let currentRevenue = 0;
    let currentLeads = 0;
    offer.conversions.forEach(conv => {
      currentRevenue += (conv.leads * payoutLeadConv) + (conv.sales * payoutSaleConv);
      currentLeads += conv.leads;
    });

    // Cap revenue is vaak in USD ingesteld in de DB. Als we die willen vergelijken
    // met de geconverteerde revenue, moeten we de cap misschien ook converteren voor weergave.
    // Voor nu converteren we de cap ook naar de display currency voor consistentie.
    const capRevenueConv = offer.capRevenue ? convert(offer.capRevenue, 'USD', 1.0) : null;

    return {
      id: offer.id,
      name: offer.name,
      network: offer.network?.name || 'Unknown',
      leads: currentLeads,
      sales: 0, 
      revenue: currentRevenue,
      capLeads: offer.capLeads,
      capRevenue: capRevenueConv
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
      // AANGEPAST: Geef valuta info door aan client
      currencySymbol={currencySymbol}
      currentCurrency={displayCurrency}
    />
  );
}