import { cookies } from 'next/headers';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import PageContainer from '@/components/PageContainer';
import FinanceManager from '@/components/FinanceManager'; // Importeer het nieuwe component

export default async function FinancePage() {
  const session: any = await getSession();
  if (!session) redirect('/login');

  const cookieStore = await cookies();
  const activeCampaignIdStr = cookieStore.get('activeCampaignId')?.value;
  
  // Als er geen cookie is, en we hebben in page.tsx al de logica om de juiste te kiezen, 
  // gaan we er hier even vanuit dat de user in de sidebar al een keuze heeft geforceerd.
  // Anders fallback naar 0 (wat een error zal geven in de client, of lege staat).
  const campaignId = activeCampaignIdStr ? parseInt(activeCampaignIdStr) : 0;

  if (campaignId === 0) {
      return <div className="p-10 text-neutral-400">Selecteer eerst een project.</div>;
  }

  const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      select: { name: true }
  });

  return (
    <PageContainer 
        title="Finance" 
        subtitle={`Beheer inkomsten en correcties voor ${campaign?.name}`}
    >
        <FinanceManager campaignId={campaignId} />
    </PageContainer>
  );
}