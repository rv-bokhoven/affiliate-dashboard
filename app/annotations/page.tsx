import { cookies } from 'next/headers';
import { prisma } from '@/lib/db';
import AnnotationManager from '@/components/AnnotationManager';
import PageContainer from '@/components/PageContainer';

export const dynamic = 'force-dynamic';

export default async function AnnotationsPage() {
  const cookieStore = await cookies();
  const activeCampaignId = cookieStore.get('activeCampaignId')?.value;
  
  if (!activeCampaignId) {
      return (
        <PageContainer title="Annotaties">
            <div className="p-8 text-neutral-400">Selecteer eerst een project om annotaties te bekijken.</div>
        </PageContainer>
      );
  }
  
  const campaignId = parseInt(activeCampaignId);

  // Haal projectnaam op voor de header
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: { name: true }
  });

  return (
    <PageContainer 
        title="Annotations" 
        subtitle={`All campaign annotations for ${campaign?.name || 'Unknown Project'}`}
    >
      <div className="max-w-full">
         <AnnotationManager campaignId={campaignId} />
      </div>
    </PageContainer>
  );
}