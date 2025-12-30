import { cookies } from 'next/headers';
import { prisma } from '@/lib/db';
import SettingsManager from '@/components/SettingsManager';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const session: any = await getSession();
  if (!session) redirect('/login');

  const cookieStore = await cookies();
  const activeCampaignId = cookieStore.get('activeCampaignId')?.value || '1';
  const campaignId = parseInt(activeCampaignId);
  
  // 1. CHECK PERMISSIES
  // Is het GEEN super admin? Dan moeten we checken of hij Project Admin is.
  if (session.role !== 'SUPER_ADMIN') {
      const member = await prisma.campaignMember.findUnique({
          where: {
              userId_campaignId: {
                  userId: session.userId,
                  campaignId: campaignId
              }
          }
      });

      // Als je geen lid bent, of je rol is geen ADMIN -> Wegwezen
      if (!member || member.role !== 'ADMIN') {
          return (
            <div className="flex flex-col items-center justify-center h-[80vh] text-neutral-500">
                <p className="text-xl font-bold mb-2">Geen Toegang 🔒</p>
                <p className="text-sm">Je hebt geen admin rechten voor dit project.</p>
            </div>
          );
      }
  }

  // 2. Haal data op (deze code had je al)
  const rawCampaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: {
        members: { include: { user: true } }
    }
  });

  if (!rawCampaign) return <div className="p-10 text-neutral-400">Project niet gevonden.</div>;

  const campaign = {
      ...rawCampaign,
      members: rawCampaign.members.map(m => ({
          id: m.id,
          role: m.role,
          email: m.user.email
      }))
  };

  return <SettingsManager campaign={campaign} />;
}