import { cookies } from 'next/headers';
import { prisma } from '@/lib/db';
import ManualEntryManager from '@/components/ManualEntryManager';
import PageContainer from '@/components/PageContainer';

export const dynamic = 'force-dynamic';

export default async function ManualPage() {
  const cookieStore = await cookies();
  const activeCampaignId = cookieStore.get('activeCampaignId')?.value;

  if (!activeCampaignId) {
    return <div className="p-10 text-white">Selecteer een project.</div>;
  }

  const campaignId = parseInt(activeCampaignId);

  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: { name: true }
  });

  const logs = await prisma.manualLog.findMany({
    where: { campaignId },
    orderBy: { date: 'desc' },
    take: 100
  });

  // NIEUW: Haal de offers op voor de dropdown
  const offers = await prisma.offer.findMany({
    where: { campaignId },
    select: { id: true, name: true },
    orderBy: { name: 'asc' }
  });

  return (
    <PageContainer 
        title="Conversion Data" 
        subtitle={`Conversion data for ${campaign?.name || 'Onbekend'}`}
    >
       <div className="max-w-full">
          {/* Geef de offers mee aan de component */}
          <ManualEntryManager campaignId={campaignId} logs={logs} offers={offers} />
       </div>
    </PageContainer>
  );
}