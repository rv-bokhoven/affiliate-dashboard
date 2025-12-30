// app/api/daily-log/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { startOfDay, endOfDay } from 'date-fns';

// 1. GET: Haal data op voor een specifieke datum
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const dateStr = searchParams.get('date');
  const campaignIdStr = searchParams.get('campaignId');

  if (!dateStr || !campaignIdStr) {
    return NextResponse.json({ error: 'Missing date or campaignId' }, { status: 400 });
  }

  const date = new Date(dateStr);
  const campaignId = parseInt(campaignIdStr);

  // Zoekbereik: De hele dag (00:00 tot 23:59)
  const range = {
    gte: startOfDay(date),
    lte: endOfDay(date)
  };

  try {
    // A. Haal Spend op
    const spends = await prisma.dailySpend.findMany({
      where: {
        campaignId: campaignId,
        date: range
      }
    });

    // B. Haal Conversies op
    const conversions = await prisma.conversion.findMany({
      where: {
        offer: { campaignId: campaignId }, // Alleen offers van deze campagne
        date: range
      }
    });

    // C. Format data voor de frontend
    // We maken er een makkelijk object van: { google: "10", microsoft: "5" }
    const spendData = {
      google: spends.find(s => s.platform.toLowerCase().includes('google'))?.amount || '',
      microsoft: spends.find(s => s.platform.toLowerCase().includes('microsoft'))?.amount || ''
    };

    // Conversies omzetten naar een map: { [offerId]: { leads: 5, sales: 1 } }
    const conversionData: Record<number, { leads: number, sales: number }> = {};
    conversions.forEach(c => {
      conversionData[c.offerId] = { leads: c.leads, sales: c.sales };
    });

    return NextResponse.json({
      spend: spendData,
      conversions: conversionData
    });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Fetch failed' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { type, date, campaignId, data } = body;

    // 1. Log opslaan (Als string voor SQLite compatibiliteit)
    const log = await prisma.dailyLog.create({
      data: {
        type,
        date: new Date(date),
        campaignId: parseInt(campaignId),
        data: JSON.stringify(data) 
      }
    });

    // 2. Data verwerken in de statistieken tabellen
    if (type === 'spend') {
      const google = parseFloat(data.google || 0);
      const microsoft = parseFloat(data.microsoft || 0);

      // Hier gebruikten we al een slimme 'upsert' functie, dus dit ging al goed
      if (google > 0) await upsertSpend(date, campaignId, 'Google Ads', google);
      if (microsoft > 0) await upsertSpend(date, campaignId, 'Microsoft Ads', microsoft);
    } 
    else if (type === 'conversions') {
      // data is hier een array: [{ offerId: 1, leads: 5 }, ...]
      for (const item of data) {
        if (item.offerId) {
            const targetDate = new Date(date);
            const offerId = parseInt(item.offerId);
            const leads = parseInt(item.leads || 0);
            const sales = parseInt(item.sales || 0);

            // STAP A: Zoek of er al een record is
            const existingConversion = await prisma.conversion.findFirst({
                where: {
                    offerId: offerId,
                    date: targetDate
                }
            });

            if (existingConversion) {
                // STAP B: UPDATE (Bestaat al? Overschrijf de aantallen)
                await prisma.conversion.update({
                    where: { id: existingConversion.id },
                    data: {
                        leads: leads,
                        sales: sales
                    }
                });
            } else {
                // STAP C: CREATE (Bestaat nog niet? Maak nieuw)
                if (leads > 0 || sales > 0) {
                    await prisma.conversion.create({
                        data: {
                            date: targetDate,
                            offerId: offerId,
                            leads: leads,
                            sales: sales
                        }
                    });
                }
            }
        }
      }
    }

    return NextResponse.json(log);
  } catch (error) {
    console.error("Error logging data:", error);
    return NextResponse.json({ error: 'Fout bij opslaan' }, { status: 500 });
  }
}

// Hulpfunctie om spend te updaten/maken (deze was al goed)
async function upsertSpend(dateStr: string, campaignId: any, platform: string, amount: number) {
  const date = new Date(dateStr);
  const cId = parseInt(campaignId);

  const existing = await prisma.dailySpend.findFirst({
    where: { date: date, campaignId: cId, platform: platform }
  });

  if (existing) {
    await prisma.dailySpend.update({
      where: { id: existing.id },
      data: { amount: amount }
    });
  } else {
    await prisma.dailySpend.create({
      data: { date: date, campaignId: cId, platform: platform, amount: amount }
    });
  }
}