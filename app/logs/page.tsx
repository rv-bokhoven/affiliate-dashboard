import { cookies } from 'next/headers';
import { prisma } from '@/lib/db';
import LogsViewer from '@/components/LogsViewer';

export default async function LogsPage() {
  const cookieStore = await cookies();
  const activeCampaignId = cookieStore.get('activeCampaignId')?.value || '1';
  const campaignId = parseInt(activeCampaignId);

  // 1. Haal Projectnaam op
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: { name: true }
  });

  // 2. Haal Logs op
  const logs = await prisma.dailyLog.findMany({
    where: { campaignId: campaignId },
    orderBy: { createdAt: 'desc' },
    take: 50 
  });

  // 3. NIEUW: Haal offer namen op voor de vertaling
  const offers = await prisma.offer.findMany({
    where: { campaignId: campaignId },
    select: { id: true, name: true }
  });

  // Maak een simpele map: { 1: "Mijn Offer Naam", 5: "Andere Offer" }
  const offerMap = offers.reduce((acc, offer) => {
    acc[offer.id] = offer.name;
    return acc;
  }, {} as Record<number, string>);

  return (
    <LogsViewer 
      logs={logs} 
      campaignName={campaign?.name || 'Unknown'} 
      offerMap={offerMap} // <--- Geef de map mee
    />
  );
}