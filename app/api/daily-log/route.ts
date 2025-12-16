import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// Hulpfunctie: Maak van alles een veilig getal
const parseCurrency = (input: any) => {
  if (!input) return 0;
  // Zet om naar string, vervang komma door punt (voor NL invoer)
  const stringVal = String(input).replace(',', '.');
  const floatVal = parseFloat(stringVal);
  // Als het nog steeds geen getal is (NaN), geef dan 0 terug
  return isNaN(floatVal) ? 0 : floatVal;
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log("API Ontving:", body); // <--- Debug: Kijk in je terminal wat hier staat!

    const { type, date, data } = body; 
    const logDate = new Date(date);

    if (type === 'spend') {
      // We gebruiken de veilige functie. 
      // We checken op 'microsoft' EN 'microsoftSpend' voor de zekerheid.
      const googleAmount = parseCurrency(data.google);
      const microsoftAmount = parseCurrency(data.microsoft || data.microsoftSpend);

      console.log("Te bewaren bedragen:", { googleAmount, microsoftAmount });

      await prisma.$transaction([
        prisma.dailySpend.upsert({
          where: { date_platform: { date: logDate, platform: 'Google' } },
          update: { amount: googleAmount },
          create: { date: logDate, platform: 'Google', amount: googleAmount },
        }),
        prisma.dailySpend.upsert({
          where: { date_platform: { date: logDate, platform: 'Microsoft' } },
          update: { amount: microsoftAmount },
          create: { date: logDate, platform: 'Microsoft', amount: microsoftAmount },
        })
      ]);
    } 
    else if (type === 'conversions') {
      await prisma.$transaction(
        data.map((item: any) => 
          prisma.conversion.upsert({
            where: { date_offerId: { date: logDate, offerId: item.offerId } },
            update: { leads: parseCurrency(item.leads), sales: parseCurrency(item.sales) }, // Hier ook veilig maken!
            create: { 
              date: logDate, 
              offerId: item.offerId, 
              leads: parseCurrency(item.leads), // En hier
              sales: parseCurrency(item.sales)  // En hier
            }
          })
        )
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("API CRASH:", error); // Duidelijke error in terminal
    return NextResponse.json({ error: 'Save failed' }, { status: 500 });
  }
}