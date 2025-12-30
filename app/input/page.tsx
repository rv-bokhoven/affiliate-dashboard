import { cookies } from 'next/headers';
import { prisma } from '@/lib/db';
import DailyInputForm from '@/components/DailyInputForm';

export default async function InputPage() {
  // 1. Lees de cookie
  const cookieStore = await cookies();
  const activeCampaignId = cookieStore.get('activeCampaignId')?.value || '1';
  const campaignId = parseInt(activeCampaignId);

  // 2. Haal de naam van de campagne op (zodat de gebruiker ziet waar hij is)
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: { name: true }
  });

  const campaignName = campaign ? campaign.name : 'Unknown Campaign';

  // 3. Render het Client Formulier en geef het ID mee
  return (
    <main className="min-h-screen bg-[#0a0a0a] flex flex-col items-center">
      <DailyInputForm campaignId={campaignId} campaignName={campaignName} />
    </main>
  );
}