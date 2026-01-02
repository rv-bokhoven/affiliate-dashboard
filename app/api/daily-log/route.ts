import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { startOfDay, endOfDay } from 'date-fns';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const dateStr = searchParams.get('date');
  const campaignIdStr = searchParams.get('campaignId');

  if (!dateStr || !campaignIdStr) {
    return NextResponse.json({ error: 'Missing date or campaignId' }, { status: 400 });
  }

  const date = new Date(dateStr);
  const campaignId = parseInt(campaignIdStr);

  const range = {
    gte: startOfDay(date),
    lte: endOfDay(date)
  };

  try {
    const spends = await prisma.dailySpend.findMany({
      where: { campaignId, date: range }
    });

    const conversions = await prisma.conversion.findMany({
      where: { offer: { campaignId }, date: range }
    });

    // C. Format data - NU MET CURRENCY INFO
    const getPlatformData = (name: string) => {
        const item = spends.find(s => s.platform.toLowerCase().includes(name));
        if (!item) return null;
        return {
            amount: item.amount,
            currency: item.currency || 'USD' // Default fallback
        };
    };

    const spendData = {
      google: getPlatformData('google'),
      microsoft: getPlatformData('microsoft')
    };

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

    // 1. Log opslaan
    const log = await prisma.dailyLog.create({
      data: {
        type,
        date: new Date(date),
        campaignId: parseInt(campaignId),
        data: JSON.stringify(data) 
      }
    });

    // 2. Data verwerken
    if (type === 'spend') {
      // Data structuur is nu: { google: { amount: "10", currency: "EUR", exchangeRate: 1.05 } }
      const googleData = data.google;
      const microsoftData = data.microsoft;

      if (googleData && parseFloat(googleData.amount) > 0) {
          await upsertSpend(date, campaignId, 'Google Ads', parseFloat(googleData.amount), googleData.currency, googleData.exchangeRate);
      }
      
      if (microsoftData && parseFloat(microsoftData.amount) > 0) {
          await upsertSpend(date, campaignId, 'Microsoft Ads', parseFloat(microsoftData.amount), microsoftData.currency, microsoftData.exchangeRate);
      }
    } 
    else if (type === 'conversions') {
      // ... Conversie logica blijft ongewijzigd ...
      for (const item of data) {
        if (item.offerId) {
            const targetDate = new Date(date);
            const offerId = parseInt(item.offerId);
            const leads = parseInt(item.leads || 0);
            const sales = parseInt(item.sales || 0);

            // Using Upsert (Native Prisma) is cleaner here too
            await prisma.conversion.upsert({
                where: {
                    date_offerId: {
                        offerId: offerId,
                        date: targetDate
                    }
                },
                update: { leads, sales },
                create: { date: targetDate, offerId, leads, sales }
            });
        }
      }
    }

    return NextResponse.json(log);
  } catch (error) {
    console.error("Error logging data:", error);
    return NextResponse.json({ error: 'Fout bij opslaan' }, { status: 500 });
  }
}

// Hulpfunctie om spend te upserten MET VALUTA
async function upsertSpend(dateStr: string, campaignId: any, platform: string, amount: number, currency: string, exchangeRate: number) {
  const date = new Date(dateStr);
  const cId = parseInt(campaignId);

  // Gebruik de unieke constraint van je schema (date + platform + campaignId)
  await prisma.dailySpend.upsert({
    where: {
        date_platform_campaign: {
            date: date,
            campaignId: cId,
            platform: platform
        }
    },
    update: {
        amount: amount,
        currency: currency || 'USD',
        exchangeRate: exchangeRate || 1.0
    },
    create: {
        date: date,
        campaignId: cId,
        platform: platform,
        amount: amount,
        currency: currency || 'USD',
        exchangeRate: exchangeRate || 1.0
    }
  });
}