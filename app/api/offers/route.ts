import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const offers = await prisma.offer.findMany({
      orderBy: { name: 'asc' },
      include: {
        network: true // <--- DIT IS DE FIX: Laad de netwerk data mee
      }
    });

    // We sturen gewoon het hele object terug, de frontend filtert wel wat het nodig heeft.
    // Geen handmatige .map() nodig hier die voor errors zorgt.
    return NextResponse.json(offers);

  } catch (error) {
    console.error('Error fetching offers:', error);
    return NextResponse.json({ error: 'Error fetching offers' }, { status: 500 });
  }
}

// ... Laat de POST en PUT functies staan zoals ze waren ...
export async function POST(req: Request) {
  // ... (Je bestaande create code)
  try {
    const body = await req.json();
    const offer = await prisma.offer.create({
      data: {
        name: body.name,
        networkId: body.networkId,
        campaignId: body.campaignId,
        payoutLead: body.payoutLead,
        payoutSale: body.payoutSale,
        capLeads: body.capLeads,
        capRevenue: body.capRevenue,
        status: body.status || 'ACTIVE'
      },
      include: { network: true }
    });
    return NextResponse.json(offer);
  } catch(e) {
    return NextResponse.json({ error: 'Error' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  // ... (Je bestaande update code)
  try {
    const body = await req.json();
    const offer = await prisma.offer.update({
        where: { id: body.id },
        data: {
            name: body.name,
            networkId: body.networkId,
            payoutLead: body.payoutLead,
            payoutSale: body.payoutSale,
            capLeads: body.capLeads,
            capRevenue: body.capRevenue,
            status: body.status
        },
        include: { network: true }
    });
    return NextResponse.json(offer);
  } catch(e) {
    return NextResponse.json({ error: 'Error' }, { status: 500 });
  }
}