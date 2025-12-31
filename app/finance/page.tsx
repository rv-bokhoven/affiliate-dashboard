import { cookies } from 'next/headers';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import PageContainer from '@/components/PageContainer';
import FinanceManager from '@/components/FinanceManager';

export const dynamic = 'force-dynamic';

export default async function FinancePage() {
  const session: any = await getSession();
  if (!session) redirect('/login');

  const cookieStore = await cookies();
  const activeCampaignIdStr = cookieStore.get('activeCampaignId')?.value;
  const campaignId = activeCampaignIdStr ? parseInt(activeCampaignIdStr) : 0;

  if (campaignId === 0) {
      return <div className="p-10 text-neutral-400">Selecteer eerst een project.</div>;
  }

  // 1. Haal de campagne op
  const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      select: { name: true }
  });

  // 2. Haal OOK de offers op van deze campagne
  const offers = await prisma.offer.findMany({
      where: { campaignId: campaignId },
      select: { id: true, name: true },
      orderBy: { name: 'asc' }
  });

  return (
    <PageContainer 
        title="Finance" 
        subtitle={`Beheer inkomsten en correcties voor ${campaign?.name}`}
    >
        {/* Geef de offers door aan het component */}
        <FinanceManager campaignId={campaignId} offers={offers} />
    </PageContainer>
  );
}