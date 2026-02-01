import { cookies } from 'next/headers';
import { prisma } from '@/lib/db';
import LogsViewer from '@/components/LogsViewer';
import PageContainer from '@/components/PageContainer'; 

export const dynamic = 'force-dynamic';

export default async function LogsPage() {
  const cookieStore = await cookies();
  const activeCampaignId = cookieStore.get('activeCampaignId')?.value;
  
  if (!activeCampaignId) {
      return (
        <PageContainer title="Systeem Logs">
            <div className="p-8 text-neutral-400">Selecteer eerst een project.</div>
        </PageContainer>
      );
  }
  
  const campaignId = parseInt(activeCampaignId);

  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: { name: true }
  });

  // Haal System Logs op
  const logs = await prisma.dailyLog.findMany({
    where: { campaignId: campaignId },
    orderBy: { createdAt: 'desc' },
    take: 100 // Iets meer logs tonen nu er meer ruimte is
  });

  // Haal offer namen op voor mapping
  const offers = await prisma.offer.findMany({
    where: { campaignId: campaignId },
    select: { id: true, name: true }
  });

  const offerMap = offers.reduce((acc, offer) => {
    acc[offer.id] = offer.name;
    return acc;
  }, {} as Record<number, string>);

  return (
    <PageContainer 
        title="Systeem Logs" 
        subtitle={`Automatische import logs voor ${campaign?.name || 'Onbekend Project'}`}
    >
      <div className="max-w-6xl mx-auto">
         <LogsViewer 
            logs={logs} 
            campaignName={campaign?.name || 'Unknown'} 
            offerMap={offerMap} 
         />
      </div>
    </PageContainer>
  );
}