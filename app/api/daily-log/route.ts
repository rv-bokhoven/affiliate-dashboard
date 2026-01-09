import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth'; // Zorg dat deze import klopt voor jouw project
import { startOfDay, endOfDay } from 'date-fns';

// ---------------------------------------------------------
// CONFIGURATIE: API BEVEILIGING
// ---------------------------------------------------------
// Kies hier een lang, sterk wachtwoord. Dit gebruik je in Make.com bij de Headers.
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
    // 1. AUTENTICATIE CHECK (Sessie OF API Key)
    const session = await getSession();
    const apiKey = req.headers.get('x-api-key');

    const isAuthorized = session || (apiKey === API_SECRET);

    if (!isAuthorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { type, date, campaignId, data } = body;

    // HULPFUNCTIE: Maak van leeg of tekst een getal (0 als leeg/fout)
    const parseAmount = (val: any) => {
        if (val === '' || val === null || val === undefined) return 0;
        // Make.com stuurt soms getallen, soms strings. parseFloat pakt beide.
        const parsed = parseFloat(val);
        return isNaN(parsed) ? 0 : parsed;
    };

    // 2. DATA VOORBEREIDEN (Schoonmaken VOORDAT we loggen)
    let processedData = data;

    if (type === 'spend') {
        // We bouwen het object opnieuw op met echte getallen
        // Dit zorgt dat ook een lege input als "0" in de logs en DB komt
        processedData = {
            google: { 
                amount: parseAmount(data.google?.amount), 
                currency: data.google?.currency || 'USD',
                exchangeRate: data.google?.exchangeRate || 1.0
            },
            microsoft: { 
                amount: parseAmount(data.microsoft?.amount), 
                currency: data.microsoft?.currency || 'USD',
                exchangeRate: data.microsoft?.exchangeRate || 1.0
            }
        };
    }

    // 3. LOG OPSLAAN (Nu met de SCHONE data waar 0 in staat i.p.v. lege strings)
    const log = await prisma.dailyLog.create({
      data: {
        type,
        date: new Date(date),
        campaignId: parseInt(campaignId),
        data: JSON.stringify(processedData) 
      }
    });

    // 4. DATABASE UPDATEN (Met de schone processedData)
    if (type === 'spend') {
      const googleData = processedData.google;
      const microsoftData = processedData.microsoft;

      // Update Google (ook als het 0 is)
      await upsertSpend(date, campaignId, 'Google Ads', googleData.amount, googleData.currency, googleData.exchangeRate);
      
      // Update Microsoft (ook als het 0 is)
      await upsertSpend(date, campaignId, 'Microsoft Ads', microsoftData.amount, microsoftData.currency, microsoftData.exchangeRate);
    }
    else if (type === 'conversions') {
      // Conversies verwerken (gebruikt data array direct, parseAmount logic zit hieronder in de loop)
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

// Hulpfunctie om spend te upserten MET VALUTA
async function upsertSpend(dateStr: string, campaignId: any, platform: string, amount: number, currency: string, exchangeRate: number) {
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