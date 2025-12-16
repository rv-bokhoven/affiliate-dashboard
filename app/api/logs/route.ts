import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// 1. ZORG DAT DEZE REGEL ERBIJ STAAT:
// Dit vertelt Next.js: "Sla deze data NOOIT op in de cache, haal altijd vers op."
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // 2. Haal de laatste 50 Spends op (gesorteerd op updatedAt = laatst gewijzigd)
    const spends = await prisma.dailySpend.findMany({
      take: 50,
      orderBy: { updatedAt: 'desc' }, // Nieuwste bovenaan
    });

    // 3. Haal de laatste 50 Conversies op
    const conversions = await prisma.conversion.findMany({
      take: 50,
      orderBy: { updatedAt: 'desc' }, // Nieuwste bovenaan
      include: { offer: true },
    });

    // 4. Combineer de lijsten
    const logs = [
      ...spends.map((s) => ({
        id: s.id,
        type: 'spend',
        date: s.date,
        description: `${s.platform} Spend: $${s.amount.toFixed(2)}`,
        updatedAt: s.updatedAt, // We gebruiken dit om te sorteren
      })),
      ...conversions.map((c) => ({
        id: c.id,
        type: 'conversion',
        date: c.date,
        description: `${c.offer.name}: ${c.leads} leads, ${c.sales} sales`,
        updatedAt: c.updatedAt,
      })),
    ];

    // 5. Sorteer de gecombineerde lijst opnieuw (zodat spend en conversions door elkaar staan op tijdstip)
    logs.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    // 6. Geef de allerlaatste 50 terug
    return NextResponse.json(logs.slice(0, 50));
    
  } catch (error) {
    return NextResponse.json({ error: 'Fout bij ophalen logs' }, { status: 500 });
  }
}

// DELETE Functie blijft hetzelfde (voor het verwijderen van items)
export async function DELETE(req: Request) {
  try {
    const { id, type } = await req.json();

    if (type === 'spend') {
      await prisma.dailySpend.delete({ where: { id } });
    } else if (type === 'conversion') {
      await prisma.conversion.delete({ where: { id } });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Verwijderen mislukt' }, { status: 500 });
  }
}