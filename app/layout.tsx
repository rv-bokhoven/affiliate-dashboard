import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import './globals.css';
import { Toaster } from 'sonner';
import Sidebar from '@/components/Sidebar';
import { prisma } from '@/lib/db';
import { cookies } from 'next/headers';
import { getSession } from '@/lib/auth';

export const metadata: Metadata = {
  title: 'Affiliate Pro',
  description: 'Advanced Campaign Tracking',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session: any = await getSession();
  
  let campaigns: any[] = [];
  let activeCampaignId = 1;
  let currentUser = null;
  let currentRole = 'MEMBER'; // Standaard rol is beperkt

  if (session) {
    const userId = session.userId;
    const userRole = session.role; // Dit is de global role (SUPER_ADMIN of USER)

    // 1. Haal user op
    currentUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { name: true, email: true, role: true }
    });

    const cookieStore = await cookies();
    const activeCampaignIdStr = cookieStore.get('activeCampaignId')?.value || '0';
    activeCampaignId = parseInt(activeCampaignIdStr);

    // 2. Haal campagnes op
    let whereClause = {};
    if (userRole !== 'SUPER_ADMIN') {
      whereClause = { members: { some: { userId: userId } } };
    }

    campaigns = await prisma.campaign.findMany({
      where: whereClause,
      select: { id: true, name: true, type: true, logo: true },
      orderBy: { name: 'asc' }
    });

    // 3. BEPAAL DE ROL VOOR HET HUIDIGE PROJECT
    if (userRole === 'SUPER_ADMIN') {
        currentRole = 'ADMIN'; // Super admin is altijd de baas
    } else {
        // Zoek de rol van deze gewone user in dit specifieke project
        const membership = await prisma.campaignMember.findUnique({
            where: {
                userId_campaignId: {
                    userId: userId,
                    campaignId: activeCampaignId
                }
            }
        });
        // Als lidmaatschap bestaat, pak die rol (ADMIN of MEMBER), anders MEMBER
        currentRole = membership?.role || 'MEMBER';
    }
  }

  return (
    <html lang="en" className="dark">
      <body className={`${GeistSans.className} bg-neutral-950 text-neutral-100 antialiased`}>
        <div className="flex min-h-screen">
          
          {session && currentUser && (
            <Sidebar 
                campaigns={campaigns} 
                activeCampaignId={activeCampaignId} 
                user={currentUser} 
                currentRole={currentRole} // <--- NIEUW: Geef de rol mee
            />
          )}
          
          <div className={`flex-1 ${session ? 'pl-64' : ''}`}> 
            {children}
          </div>
          
        </div>
        <Toaster position="top-right" theme="dark" closeButton richColors />
      </body>
    </html>
  );
}