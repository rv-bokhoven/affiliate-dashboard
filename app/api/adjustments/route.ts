import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { startOfMonth, endOfMonth } from 'date-fns';

// GET: Haal adjustments op
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const campaignId = searchParams.get('campaignId');
  const now = new Date();
  
  if (!campaignId) return NextResponse.json([]);

  const adjustments = await prisma.revenueAdjustment.findMany({
    where: { 
      campaignId: parseInt(campaignId),
      date: { gte: startOfMonth(now), lte: endOfMonth(now) }
    }
  });

  return NextResponse.json(adjustments);
}

// POST: Upsert op basis van Offer ID
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { amount, offerId, networkId, campaignId } = body; // offerId ipv networkId als unieke key
    
    const now = new Date(); 

    // Zoek of er al een adjustment is voor DIT OFFER deze maand
    const existingEntry = await prisma.revenueAdjustment.findFirst({
      where: {
        offerId: parseInt(offerId), // <--- Hier kijken we nu naar
        campaignId: parseInt(campaignId),
        date: { gte: startOfMonth(now), lte: endOfMonth(now) }
      }
    });

    if (existingEntry) {
      // UPDATE
      const updated = await prisma.revenueAdjustment.update({
        where: { id: existingEntry.id },
        data: { 
          amount: parseFloat(amount),
          date: now 
        }
      });
      return NextResponse.json(updated);
    } else {
      // CREATE
      const created = await prisma.revenueAdjustment.create({
        data: {
          amount: parseFloat(amount),
          date: now,
          description: 'Monthly Offer RevShare',
          offerId: parseInt(offerId),     // Koppel aan offer
          networkId: parseInt(networkId), // We slaan het netwerk ook op voor de zekerheid
          campaignId: parseInt(campaignId),
          currency: 'USD'
        }
      });
      return NextResponse.json(created);
    }

  } catch (error) {
    console.error("Error saving adjustment:", error);
    return NextResponse.json({ error: 'Fout bij opslaan' }, { status: 500 });
  }
}