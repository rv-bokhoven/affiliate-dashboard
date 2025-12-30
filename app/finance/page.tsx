import { cookies } from 'next/headers';
import { prisma } from '@/lib/db';
import FinanceManager from '@/components/FinanceManager';

export default async function FinancePage() {
  const cookieStore = await cookies();
  const activeCampaignId = cookieStore.get('activeCampaignId')?.value || '1';
  const campaignId = parseInt(activeCampaignId);

  // Campagne Info
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: { name: true }
  });

  // Haal OFFERS op voor deze campagne (ipv Netwerken)
  // We willen ze alfabetisch zien
  const offers = await prisma.offer.findMany({
    where: { campaignId: campaignId },
    include: { network: true },
    orderBy: { name: 'asc' }
  });

  return (
    <main className="min-h-screen bg-[#0a0a0a] flex flex-col items-center">
      <FinanceManager 
        offers={offers}
        campaignId={campaignId}
        campaignName={campaign?.name || 'Unknown'}
      />
    </main>
  );
}