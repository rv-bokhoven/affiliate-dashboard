// prisma/export.ts
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

// Helper functie om data naar CSV te schrijven
function writeCSV(filename: string, headers: string[], rows: any[]) {
  const filePath = path.join(__dirname, 'backup', filename);
  
  // Zorg dat de backup map bestaat
  const backupDir = path.join(__dirname, 'backup');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir);
  }

  // Maak de header regel
  const headerLine = headers.join(',');

  // Maak de data regels
  const dataLines = rows.map(row => {
    return headers.map(header => {
      const val = row[header];
      // Datums netjes formatteren naar YYYY-MM-DD
      if (val instanceof Date) {
        return val.toISOString().split('T')[0];
      }
      return val;
    }).join(',');
  });

  const csvContent = [headerLine, ...dataLines].join('\n');
  fs.writeFileSync(filePath, csvContent);
  console.log(`✅ ${filename} aangemaakt met ${rows.length} regels.`);
}

async function main() {
  console.log('💾 Start backup van Live Database...');

  // 1. OFFERS
  const offers = await prisma.offer.findMany();
  // We exporteren hier specifieke velden
  const offerData = offers.map(o => ({
    id: o.id,
    name: o.name,
    network: o.network || '',
    payoutLead: o.payoutLead,
    payoutSale: o.payoutSale
  }));
  writeCSV('backup_offers.csv', ['id', 'name', 'network', 'payoutLead', 'payoutSale'], offerData);

  // 2. DAILY SPEND
  const spend = await prisma.dailySpend.findMany();
  const spendData = spend.map(s => ({
    date: s.date,
    platform: s.platform,
    amount: s.amount
  }));
  writeCSV('backup_dailyspend.csv', ['date', 'platform', 'amount'], spendData);

  // 3. CONVERSIONS
  const conversions = await prisma.conversion.findMany();
  const conversionData = conversions.map(c => ({
    date: c.date,
    offerId: c.offerId,
    leads: c.leads,
    sales: c.sales
  }));
  writeCSV('backup_conversions.csv', ['date', 'offerId', 'leads', 'sales'], conversionData);
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());