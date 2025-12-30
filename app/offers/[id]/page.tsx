import { notFound, redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import PageContainer from '@/components/PageContainer';
import OfferClient from './OfferClient'; // We maken zo ook even deze client component check
import { 
  startOfMonth, endOfMonth, endOfDay as dateFnsEndOfDay, format, startOfWeek 
} from 'date-fns';

export const dynamic = 'force-dynamic';

function getEndOfDay(date: Date) { return dateFnsEndOfDay(date); }
function getGroupKey(date: Date) { return format(date, 'yyyy-MM-dd'); }

export default async function OfferPage({ 
  params, 
  searchParams 
}: { 
  params: Promise<{ id: string }>,
  searchParams: Promise<{ [key: string]: string | undefined }> 
}) {
  const { id } = await params; // Await params (Next.js 15+ best practice)
  const offerId = parseInt(id);
  const session: any = await getSession();

  if (!session) redirect('/login');
  if (isNaN(offerId)) return notFound();

  // 1. HAAL OFFER OP + CAMPAGNE + MEMBERS
  // We halen hem op puur op ID. Daarna checken we pas de rechten.
  const offer = await prisma.offer.findUnique({
    where: { id: offerId },
    include: {
      network: true,
      campaign: {
        include: {
          members: true // Nodig voor permissie check
        }
      },
      conversions: true // We filteren de datum later in JS of via een aparte query als het traag wordt
    }
  });

  if (!offer) {
    return (
      <PageContainer title="Niet gevonden" subtitle="Offer bestaat niet">
        <div className="p-10 text-neutral-400">Offer met ID {offerId} niet gevonden.</div>
      </PageContainer>
    );
  }

  // 2. SECURITY CHECK
  // Heeft de ingelogde user toegang tot de campagne van dit offer?
  let hasAccess = false;
  if (session.role === 'SUPER_ADMIN') {
    hasAccess = true;
  } else {
    // Check of userId in de members lijst staat van deze campagne
    hasAccess = offer.campaign.members.some(m => m.userId === session.userId);
  }

  if (!hasAccess) {
    return (
      <PageContainer title="Geen Toegang" subtitle="Beveiligd">
        <div className="p-10 text-red-400">Je hebt geen rechten om dit offer te bekijken.</div>
      </PageContainer>
    );
  }

  // --- 3. DATA VERWERKEN VOOR GRAFIEKEN ---
  // Dit lijkt op de logica van het dashboard, maar dan specifiek voor 1 offer.
  
  const queryParams = await searchParams;
  const range = queryParams.range || 'this_month';
  const now = new Date();
  
  let start = startOfMonth(now);
  let end = getEndOfDay(endOfMonth(now));

  // Simpele datum logica (kan uitgebreid worden zoals in dashboard)
  if (range === 'this_year') { start = new Date(now.getFullYear(), 0, 1); }
  if (range === 'all') { start = new Date('2020-01-01'); }

  // Filter conversies op datum
  const filteredConversions = offer.conversions.filter(c => c.date >= start && c.date <= end);

  let totalRevenue = 0;
  let totalLeads = 0;
  let totalSales = 0;

  const chartMap = new Map<string, { revenue: number, leads: number, sales: number }>();

  filteredConversions.forEach(conv => {
    const rev = (conv.leads * offer.payoutLead) + (conv.sales * offer.payoutSale);
    totalRevenue += rev;
    totalLeads += conv.leads;
    totalSales += conv.sales;

    const key = getGroupKey(conv.date);
    const current = chartMap.get(key) || { revenue: 0, leads: 0, sales: 0 };
    chartMap.set(key, {
      revenue: current.revenue + rev,
      leads: current.leads + conv.leads,
      sales: current.sales + conv.sales
    });
  });

  const chartData = Array.from(chartMap.entries())
    .map(([date, vals]) => ({
      date,
      revenue: vals.revenue,
      leads: vals.leads,
      sales: vals.sales
    }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // We geven de data door aan een Client Component voor de weergave
  return (
    <OfferClient 
      offer={offer}
      chartData={chartData}
      totals={{ revenue: totalRevenue, leads: totalLeads, sales: totalSales }}
      campaignType={offer.campaign.type}
    />
  );
}