// scripts/backup.ts
import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const prisma = new PrismaClient();

async function main() {
  console.log('📦 Data ophalen uit lokale database...');

  // 1. Haal alle data op
  const offers = await prisma.offer.findMany();
  const dailySpends = await prisma.dailySpend.findMany();
  const conversions = await prisma.conversion.findMany();

  // 2. Stop alles in één object
  const data = {
    offers,
    dailySpends,
    conversions,
  };

  // 3. Schrijf naar een bestand
  fs.writeFileSync('backup.json', JSON.stringify(data, null, 2));
  
  console.log(`✅ Succes! Backup opgeslagen in 'backup.json' met:`);
  console.log(`- ${offers.length} Offers`);
  console.log(`- ${dailySpends.length} Spends`);
  console.log(`- ${conversions.length} Conversies`);
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());