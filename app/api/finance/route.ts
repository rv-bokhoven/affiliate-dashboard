import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { startOfMonth, endOfMonth, parseISO } from 'date-fns';

export async function GET(req: Request) {
  const session: any = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const campaignIdStr = searchParams.get('campaignId');
  const monthStr = searchParams.get('month');

  if (!campaignIdStr) return NextResponse.json({ error: 'Campaign ID required' }, { status: 400 });
  const campaignId = parseInt(campaignIdStr);

  const now = new Date();
  let start = startOfMonth(now);
  let end = endOfMonth(now);

  if (monthStr) {
      const date = parseISO(`${monthStr}-01`);
      start = startOfMonth(date);
      end = endOfMonth(date);
  }

  try {
    const adjustments = await prisma.adjustment.findMany({
      where: {
        campaignId: campaignId,
        date: { gte: start, lte: end }
      },
      // NIEUW: Laad de offer data mee (voor de naam in de lijst)
      include: {
        offer: { select: { name: true } }
      },
      orderBy: { date: 'desc' }
    });
    return NextResponse.json(adjustments);
  } catch (error) {
    return NextResponse.json({ error: 'Error fetching finance data' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session: any = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    
    if (!body.campaignId) return NextResponse.json({ error: 'Campaign ID is missing' }, { status: 400 });

    // NIEUW: Check of offerId is meegegeven (en niet leeg is)
    const offerId = body.offerId ? parseInt(body.offerId) : null;

    const adjustment = await prisma.adjustment.create({
      data: {
        amount: parseFloat(body.amount),
        description: body.description,
        type: body.type, 
        date: new Date(body.date), 
        campaignId: parseInt(body.campaignId),
        offerId: offerId // <--- Opslaan!
      }
    });

    return NextResponse.json(adjustment);
  } catch (error) {
    console.error("Finance Error:", error);
    return NextResponse.json({ error: 'Kon item niet opslaan' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
    // ... (deze blijft ongewijzigd) ...
    const session: any = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
    try {
      const { searchParams } = new URL(req.url);
      const id = searchParams.get('id');
      if (!id) return NextResponse.json({ error: 'ID missing' }, { status: 400 });
  
      await prisma.adjustment.delete({ where: { id: parseInt(id) } });
      return NextResponse.json({ success: true });
    } catch (error) {
      return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
    }
}