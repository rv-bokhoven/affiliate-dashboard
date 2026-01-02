import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth'; // Zorg dat deze import klopt

export async function GET(req: Request) {
  const session: any = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const campaignId = searchParams.get('campaignId');

    // Als er een campaignId is, filteren we daarop (handig voor dropdowns)
    const where = campaignId ? { campaignId: parseInt(campaignId) } : {};

    const offers = await prisma.offer.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        network: true 
      }
    });

    return NextResponse.json(offers);
  } catch (error) {
    console.error('Error fetching offers:', error);
    return NextResponse.json({ error: 'Error fetching offers' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session: any = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    
    // Validatie: CampaignID is verplicht
    if (!body.campaignId) {
        return NextResponse.json({ error: 'Campaign ID missing' }, { status: 400 });
    }

    const offer = await prisma.offer.create({
      data: {
        name: body.name,
        campaignId: parseInt(body.campaignId),
        networkId: body.networkId ? parseInt(body.networkId) : null,
        
        // NIEUW: Currency opslaan (default naar USD als leeg)
        currency: body.currency || 'USD',

        // Getallen veilig parsen (voorkomt crashes)
        payoutLead: parseFloat(body.payoutLead || 0),
        payoutSale: parseFloat(body.payoutSale || 0),
        
        capLeads: body.capLeads ? parseInt(body.capLeads) : null,
        capRevenue: body.capRevenue ? parseFloat(body.capRevenue) : null,
        
        status: body.status || 'ACTIVE'
      },
      include: { network: true }
    });
    return NextResponse.json(offer);
  } catch(e) {
    console.error(e);
    return NextResponse.json({ error: 'Error creating offer' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const session: any = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    
    if (!body.id) return NextResponse.json({ error: 'ID missing' }, { status: 400 });

    const offer = await prisma.offer.update({
        where: { id: parseInt(body.id) },
        data: {
            name: body.name,
            networkId: body.networkId ? parseInt(body.networkId) : null,
            
            // NIEUW: Currency updaten
            currency: body.currency,

            payoutLead: parseFloat(body.payoutLead || 0),
            payoutSale: parseFloat(body.payoutSale || 0),
            
            capLeads: body.capLeads ? parseInt(body.capLeads) : null,
            capRevenue: body.capRevenue ? parseFloat(body.capRevenue) : null,
            
            status: body.status
        },
        include: { network: true }
    });
    return NextResponse.json(offer);
  } catch(e) {
    console.error(e);
    return NextResponse.json({ error: 'Error updating offer' }, { status: 500 });
  }
}