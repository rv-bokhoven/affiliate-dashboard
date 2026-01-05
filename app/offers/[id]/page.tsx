import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
// HIER ZIT DE FIX: We importeren nu uit de components map
import OfferDetailClient from '@/components/OfferDetailClient'; 
import { 
  startOfMonth, endOfMonth, subMonths, 
  startOfWeek, endOfWeek, subWeeks, 
  startOfYear, endOfYear, 
  parseISO, format, 
  endOfDay as dateFnsEndOfDay
} from 'date-fns';

export const dynamic = 'force-dynamic';

// CONFIGURATIE
const EUR_USD_RATE = 1.17; 

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

export default async function OfferDetailPage({ 
    params, searchParams 
}: { 
    params: Promise<{ id: string }>,
    searchParams: Promise<{ [key: string]: string | undefined }> 
}) {
  const session: any = await getSession();
  if (!session) redirect('/login');

  const { id } = await params;
  const qParams = await searchParams;

  const offerId = parseInt(id);
  if (isNaN(offerId)) return <div>Ongeldig ID</div>;

  // 1. BEPAAL VALUTA & DATUM
  const displayCurrency = qParams.currency === 'EUR' ? 'EUR' : 'USD';
  const currencySymbol = displayCurrency === 'EUR' ? '€' : '$';
  
  const { range, from, to } = qParams;
  const { start, end } = getDateRange(range || 'this_month', from, to);

  // 2. CONVERSIE FUNCTIE
  const convert = (amount: number, itemCurrency: string) => {
    const itemRate = itemCurrency === 'EUR' ? EUR_USD_RATE : 1.0;
    const amountInUSD = itemCurrency === 'EUR' ? amount * itemRate : amount;

    if (displayCurrency === 'USD') return amountInUSD;
    if (displayCurrency === 'EUR') return amountInUSD / EUR_USD_RATE;
    return amountInUSD;
  };

  // 3. HAAL DATA
  const offer = await prisma.offer.findUnique({
      where: { id: offerId },
      include: {
          network: true,
          conversions: {
              where: { date: { gte: start, lte: end } },
              orderBy: { date: 'asc' }
          }
      }
  });

  if (!offer) return <div className="p-10 text-white">Offer niet gevonden.</div>;

  // 4. BEREKEN STATS
  const payoutLeadConv = convert(offer.payoutLead, offer.currency || 'USD');
  const payoutSaleConv = convert(offer.payoutSale, offer.currency || 'USD');

  let totalLeads = 0;
  let totalSales = 0;
  let totalRevenue = 0;

  const chartMap = new Map<string, { leads: number, sales: number, revenue: number }>();

  offer.conversions.forEach(c => {
      totalLeads += c.leads;
      totalSales += c.sales;
      const rev = (c.leads * payoutLeadConv) + (c.sales * payoutSaleConv);
      totalRevenue += rev;

      const key = format(c.date, 'yyyy-MM-dd');
      const current = chartMap.get(key) || { leads: 0, sales: 0, revenue: 0 };
      chartMap.set(key, {
          leads: current.leads + c.leads,
          sales: current.sales + c.sales,
          revenue: current.revenue + rev
      });
  });

  const chartData = Array.from(chartMap.entries())
    .map(([date, vals]) => ({ date, ...vals }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const conversionRate = totalLeads > 0 ? (totalSales / totalLeads) * 100 : 0;

  return (
    <OfferDetailClient 
        offer={{
            id: offer.id,
            name: offer.name,
            network: offer.network?.name || 'Unknown',
            status: offer.status,
            currency: offer.currency || 'USD',
            payoutLead: offer.payoutLead,
            payoutSale: offer.payoutSale,
            capLeads: offer.capLeads ? offer.capLeads : undefined,
            capRevenue: offer.capRevenue ? offer.capRevenue : undefined,
        }}
        stats={{
            leads: totalLeads,
            sales: totalSales,
            revenue: totalRevenue,
            epc: 0, 
            cr: conversionRate,
            clicks: 0
        }}
        chartData={chartData}
        currencySymbol={currencySymbol}
        currentCurrency={displayCurrency}
    />
  );
}