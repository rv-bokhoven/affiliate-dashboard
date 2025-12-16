// app/api/offers/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  const offers = await prisma.offer.findMany({ orderBy: { name: 'asc' } });
  return NextResponse.json(offers);
}

export async function POST(req: Request) {
  const body = await req.json();
  const { name, network, payoutLead, payoutSale, capLeads, capRevenue } = body; // <--- Voeg caps toe

  const offer = await prisma.offer.create({
    data: {
      name,
      network,
      payoutLead: parseFloat(payoutLead || 0),
      payoutSale: parseFloat(payoutSale || 0),
      // NIEUW: Opslaan (als het leeg is, stuur undefined zodat het null wordt in DB)
      capLeads: capLeads ? parseInt(capLeads) : undefined,
      capRevenue: capRevenue ? parseFloat(capRevenue) : undefined,
    },
  });
  return NextResponse.json(offer);
}

// 3. PUT: Update een bestaande offer
export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, name, network, payoutLead, payoutSale, capLeads, capRevenue } = body; // <--- Voeg caps toe

    const updatedOffer = await prisma.offer.update({
      where: { id: parseInt(id) },
      data: {
        name,
        network,
        payoutLead: parseFloat(payoutLead || 0),
        payoutSale: parseFloat(payoutSale || 0),
        // NIEUW:
        capLeads: capLeads ? parseInt(capLeads) : null, // null om te resetten
        capRevenue: capRevenue ? parseFloat(capRevenue) : null,
      },
    });

    return NextResponse.json(updatedOffer);
  } catch (error) {
    return NextResponse.json({ error: 'Update mislukt' }, { status: 500 });
  }
}