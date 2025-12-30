// app/api/offers/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// 1. GET: Haal offers op (eventueel gefilterd op campaignId)
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const campaignId = searchParams.get('campaignId');

  // Als er een ID is meegegeven, filter daarop. Anders alles.
  const where = campaignId ? { campaignId: parseInt(campaignId) } : {};

  const offers = await prisma.offer.findMany({ 
    where,
    include: { network: true }, // Haal de naam van de partner op
    orderBy: { name: 'asc' } 
  });
  
  return NextResponse.json(offers);
}

// 2. POST: Nieuwe offer aanmaken
export async function POST(req: Request) {
  try {
    const body = await req.json();
    // Let op: we lezen nu networkId en campaignId
    const { name, networkId, campaignId, payoutLead, payoutSale, capLeads, capRevenue, status } = body;

    const offer = await prisma.offer.create({
      data: {
        name,
        // Koppel aan Partner (Netwerk) en Campagne
        networkId: networkId ? parseInt(networkId) : undefined,
        campaignId: campaignId ? parseInt(campaignId) : undefined,

        payoutLead: parseFloat(payoutLead || 0),
        payoutSale: parseFloat(payoutSale || 0),
        
        // Caps
        capLeads: capLeads ? parseInt(capLeads) : undefined,
        capRevenue: capRevenue ? parseFloat(capRevenue) : undefined,
        
        status: status || 'ACTIVE'
      },
    });
    return NextResponse.json(offer);
  } catch (error) {
    console.error("Error creating offer:", error);
    return NextResponse.json({ error: 'Fout bij aanmaken offer' }, { status: 500 });
  }
}

// 3. PUT: Update een bestaande offer
export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, name, networkId, payoutLead, payoutSale, capLeads, capRevenue, status } = body;

    const updatedOffer = await prisma.offer.update({
      where: { id: parseInt(id) },
      data: {
        name,
        // Update relatie naar netwerk
        networkId: networkId ? parseInt(networkId) : null,
        
        payoutLead: parseFloat(payoutLead || 0),
        payoutSale: parseFloat(payoutSale || 0),
        
        capLeads: capLeads ? parseInt(capLeads) : null, // null om te resetten
        capRevenue: capRevenue ? parseFloat(capRevenue) : null,
        
        status: status // Update status (bijv. PAUSED)
      },
    });

    return NextResponse.json(updatedOffer);
  } catch (error) {
    console.error("Error updating offer:", error);
    return NextResponse.json({ error: 'Update mislukt' }, { status: 500 });
  }
}