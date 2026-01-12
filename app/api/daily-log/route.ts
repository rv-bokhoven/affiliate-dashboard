import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { startOfDay, endOfDay } from 'date-fns';

// ---------------------------------------------------------
// CONFIGURATIE: API BEVEILIGING
// ---------------------------------------------------------
const API_SECRET = process.env.API_SECRET || '301Willemstraat!27';

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

    // C. Format data - NU MET CLICKS EN CURRENCY
    const getPlatformData = (name: string) => {
        const item = spends.find(s => s.platform.toLowerCase().includes(name));
        if (!item) return null;
        return {
            amount: item.amount,
            clicks: item.clicks || 0, // <--- NIEUW: Clicks meegeven aan dashboard
            currency: item.currency || 'USD'
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
    // 1. AUTENTICATIE CHECK
    const session = await getSession();
    const apiKey = req.headers.get('x-api-key');

    const isAuthorized = session || (apiKey === API_SECRET);

    if (!isAuthorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { type, date, campaignId, data } = body;

    // HULPFUNCTIE: Maak van leeg of tekst een float (bedrag)
    const parseAmount = (val: any) => {
        if (val === '' || val === null || val === undefined) return 0;
        const parsed = parseFloat(val);
        return isNaN(parsed) ? 0 : parsed;
    };

    // HULPFUNCTIE: Maak van leeg of tekst een integer (clicks) -- NIEUW
    const parseClicks = (val: any) => {
        if (val === '' || val === null || val === undefined) return 0;
        const parsed = parseInt(val);
        return isNaN(parsed) ? 0 : parsed;
    };

    // 2. DATA VOORBEREIDEN
    let processedData: any = {};

    if (type === 'spend') {
        // Google Data Verwerken
        if (data.google) {
            processedData.google = { 
                amount: parseAmount(data.google.amount), 
                clicks: parseClicks(data.google.clicks), // <--- Clicks ophalen
                currency: data.google.currency || 'USD',
                exchangeRate: data.google.exchangeRate || 1.0
            };
        }

        // Microsoft Data Verwerken
        if (data.microsoft) {
            processedData.microsoft = { 
                amount: parseAmount(data.microsoft.amount), 
                clicks: parseClicks(data.microsoft.clicks), // <--- Clicks ophalen
                currency: data.microsoft.currency || 'USD',
                exchangeRate: data.microsoft.exchangeRate || 1.0
            };
        }
    } else {
        processedData = data;
    }

    // 3. LOG OPSLAAN
    const log = await prisma.dailyLog.create({
      data: {
        type,
        date: new Date(date),
        campaignId: parseInt(campaignId),
        data: JSON.stringify(processedData) 
      }
    });

    // 4. DATABASE UPDATEN
    if (type === 'spend') {
      
      if (processedData.google) {
          await upsertSpend(
            date, 
            campaignId, 
            'Google Ads', 
            processedData.google.amount, 
            processedData.google.clicks, // <--- Clicks doorgeven
            processedData.google.currency, 
            processedData.google.exchangeRate
          );
      }
      
      if (processedData.microsoft) {
          await upsertSpend(
            date, 
            campaignId, 
            'Microsoft Ads', 
            processedData.microsoft.amount, 
            processedData.microsoft.clicks, // <--- Clicks doorgeven
            processedData.microsoft.currency, 
            processedData.microsoft.exchangeRate
          );
      }
    }
    else if (type === 'conversions') {
      for (const item of data) {
        if (item.offerId) {
            const targetDate = new Date(date);
            const offerId = parseInt(item.offerId);
            const leads = parseInt(item.leads || 0);
            const sales = parseInt(item.sales || 0);

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

// Hulpfunctie om spend te upserten MET CLICKS EN VALUTA
async function upsertSpend(
    dateStr: string, 
    campaignId: any, 
    platform: string, 
    amount: number, 
    clicks: number, // <--- Nieuw argument
    currency: string, 
    exchangeRate: number
) {
  const date = new Date(dateStr);
  const cId = parseInt(campaignId);

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
        clicks: clicks, // <--- Update clicks
        currency: currency || 'USD',
        exchangeRate: exchangeRate || 1.0
    },
    create: {
        date: date,
        campaignId: cId,
        platform: platform,
        amount: amount,
        clicks: clicks, // <--- Create clicks
        currency: currency || 'USD',
        exchangeRate: exchangeRate || 1.0
    }
  });
}