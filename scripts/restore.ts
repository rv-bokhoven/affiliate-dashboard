// scripts/restore.ts
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Bezig met data herstellen...');

  // Pad naar backup.json
  const backupPath = path.join(process.cwd(), 'backup.json');

  // Check of bestand bestaat
  if (!fs.existsSync(backupPath)) {
    console.error('❌ Geen backup.json gevonden! Zorg dat je eerst een backup maakt.');
    return;
  }

  const rawData = fs.readFileSync(backupPath, 'utf-8');
  const data = JSON.parse(rawData);

  console.log(`📦 Gevonden in backup: ${data.offers?.length || 0} Offers, ${data.dailySpends?.length || 0} Spends, ${data.conversions?.length || 0} Conversions.`);

  // 1. OFFERS
  if (data.offers && data.offers.length > 0) {
    console.log('🔄 Offers verwerken...');
    for (const item of data.offers) {
      await prisma.offer.upsert({
        where: { id: item.id },
        update: {}, // Doe niets als hij al bestaat
        create: {
          ...item,
          // Datums repareren (String -> Date)
          created_at: item.created_at ? new Date(item.created_at) : undefined,
          updated_at: item.updated_at ? new Date(item.updated_at) : undefined
        },
      });
    }
  }

  // 2. DAILY SPENDS
  if (data.dailySpends && data.dailySpends.length > 0) {
    console.log('🔄 Spends verwerken...');
    for (const item of data.dailySpends) {
      // Check of deze spend al bestaat (datum + platform)
      const exists = await prisma.dailySpend.findFirst({
        where: { 
          date: new Date(item.date),
          platform: item.platform 
        }
      });

      if (!exists) {
        await prisma.dailySpend.create({
          data: {
              ...item,
              date: new Date(item.date) // String -> Date conversie
          } 
        });
      }
    }
  }

  // 3. CONVERSIONS
  if (data.conversions && data.conversions.length > 0) {
    console.log('🔄 Conversies verwerken...');
    for (const item of data.conversions) {
      // Check of conversie al bestaat
      const exists = await prisma.conversion.findFirst({
        where: { 
          date: new Date(item.date),
          offerId: item.offerId 
        }
      });

      if (!exists) {
        await prisma.conversion.create({
          data: {
              ...item,
              date: new Date(item.date) // String -> Date conversie
          }
        });
      }
    }
  }

  console.log('✅ Klaar! Alle data zit weer in je lokale database.');
}

main()
  .catch((e) => {
    console.error('❌ Er ging iets mis:', e);
    process.exit(1);
  })
  .finally(async () => await prisma.$disconnect());