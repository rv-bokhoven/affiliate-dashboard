import { cookies } from 'next/headers';
import { prisma } from '@/lib/db';
import OffersManager from '@/components/OffersManager';

// Zorgt dat de pagina altijd vers wordt opgebouwd (voorkomt caching problemen)
export const dynamic = 'force-dynamic';

export default async function OffersPage() {
  const cookieStore = await cookies();
  const activeCampaignId = cookieStore.get('activeCampaignId')?.value || '1';
  const campaignId = parseInt(activeCampaignId);

  // 1. Haal Campagne Info
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: { name: true }
  });

  // 2. Haal Offers (Prisma haalt automatisch het nieuwe 'currency' veld mee op!)
  const offers = await prisma.offer.findMany({
    where: { campaignId: campaignId },
    include: { network: true },
    orderBy: { id: 'desc' }
  });

  // 3. Haal Netwerken (voor dropdown)
  const networks = await prisma.affiliateNetwork.findMany({
    orderBy: { name: 'asc' }
  });

  return (
    <main className="flex flex-col items-center">
      <OffersManager 
        initialOffers={offers} 
        networks={networks}
        campaignId={campaignId}
        campaignName={campaign?.name || 'Unknown'}
      />
    </main>
  );
}