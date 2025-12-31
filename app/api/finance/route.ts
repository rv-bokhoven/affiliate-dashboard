import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { startOfMonth, endOfMonth, parseISO } from 'date-fns';

export async function GET(req: Request) {
  const session: any = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const campaignIdStr = searchParams.get('campaignId');
  const monthStr = searchParams.get('month'); // Verwacht "yyyy-MM"

  if (!campaignIdStr) return NextResponse.json({ error: 'Campaign ID required' }, { status: 400 });
  const campaignId = parseInt(campaignIdStr);

  // Datum range bepalen
  const now = new Date();
  let start = startOfMonth(now);
  let end = endOfMonth(now);

  if (monthStr) {
      const date = parseISO(`${monthStr}-01`); // "2024-01" -> Date object
      start = startOfMonth(date);
      end = endOfMonth(date);
  }

  try {
    const adjustments = await prisma.adjustment.findMany({
      where: {
        campaignId: campaignId,
        date: { gte: start, lte: end }
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
    
    // VALIDATIE FIX: Check of campaignId er is
    if (!body.campaignId) {
        return NextResponse.json({ error: 'Campaign ID is missing' }, { status: 400 });
    }

    const adjustment = await prisma.adjustment.create({
      data: {
        amount: parseFloat(body.amount),
        description: body.description,
        type: body.type, // 'BONUS' of 'DEDUCTION'
        date: new Date(body.date), // Gebruik de datum die de frontend stuurt
        campaignId: parseInt(body.campaignId)
      }
    });

    return NextResponse.json(adjustment);
  } catch (error) {
    console.error("Finance Error:", error); // Zie de echte error in je Vercel logs
    return NextResponse.json({ error: 'Kon item niet opslaan' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
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