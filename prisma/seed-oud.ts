import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

// Helper om CSV in te lezen en op te schonen
const readCSV = (fileName: string) => {
  const filePath = path.join(__dirname, 'data', fileName);
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  // Split op enter, sla header over, filter lege regels
  return fileContent.split('\n').slice(1).filter((row) => row.trim().length > 0);
};

async function main() {
  console.log('🚀 Start importeren...');

  // --- 1. DAILY SPEND ---
  try {
    const rows = readCSV('dailyspend.csv');
    console.log(`Processing ${rows.length} daily spend rows...`);

    for (const row of rows) {
      // Split op komma (gebruik ';' als je Excel export dat doet)
      const [dateStr, platform, amountStr] = row.split(','); 

      await prisma.dailySpend.upsert({
        where: {
          // Dit is de @@unique constraint uit je schema
          date_platform: {
            date: new Date(dateStr),
            platform: platform.trim(),
          },
        },
        update: {
          amount: parseFloat(amountStr),
        },
        create: {
          date: new Date(dateStr),
          platform: platform.trim(),
          amount: parseFloat(amountStr),
        },
      });
    }
    console.log('✅ Daily Spend geïmporteerd.');
  } catch (error) {
    console.warn('⚠️ Daily Spend import overgeslagen of fout:', error);
  }

  // --- 2. CONVERSIONS ---
  try {
    const rows = readCSV('conversions.csv');
    console.log(`Processing ${rows.length} conversion rows...`);

    for (const row of rows) {
      const [dateStr, offerIdStr, leadsStr, salesStr] = row.split(',');

      await prisma.conversion.upsert({
        where: {
          // Dit is de @@unique constraint uit je schema
          date_offerId: {
            date: new Date(dateStr),
            offerId: parseInt(offerIdStr),
          },
        },
        update: {
          leads: parseInt(leadsStr),
          sales: parseInt(salesStr),
        },
        create: {
          date: new Date(dateStr),
          offerId: parseInt(offerIdStr), // Direct het ID gebruiken
          leads: parseInt(leadsStr),
          sales: parseInt(salesStr),
        },
      });
    }
    console.log('✅ Conversies geïmporteerd.');
  } catch (error) {
    console.warn('⚠️ Conversion import overgeslagen of fout:', error);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });