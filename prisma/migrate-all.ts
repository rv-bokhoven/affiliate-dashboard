// prisma/migrate-all.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Start migratie proces...');

  // ==========================================
  // DEEL 1: Campagne Migratie
  // ==========================================
  console.log('\n--- 1. Campagne Migratie ---');

  // 1. Maak de standaard campagne aan
  const mainCampaign = await prisma.campaign.upsert({
    where: { id: 1 },
    update: {},
    create: {
      name: "Mijn Eerste Project",
      type: "PAID",    // Let op: dit is nu een String, geen Enum
      currency: "USD"
    }
  });
  console.log(`✅ Default campagne '${mainCampaign.name}' is beschikbaar (ID: ${mainCampaign.id}).`);

  // 2. Update Offers zonder campagne
  const offersUpdate = await prisma.offer.updateMany({
    where: { campaignId: null },
    data: { campaignId: mainCampaign.id }
  });
  console.log(`🔗 ${offersUpdate.count} offers gekoppeld aan campagne.`);

  // 3. Update DailySpend zonder campagne
  const spendUpdate = await prisma.dailySpend.updateMany({
    where: { campaignId: null },
    data: { campaignId: mainCampaign.id }
  });
  console.log(`🔗 ${spendUpdate.count} daily spend regels gekoppeld aan campagne.`);


  // ==========================================
  // DEEL 2: Netwerk / Partner Migratie
  // ==========================================
  console.log('\n--- 2. Partner (Netwerk) Migratie ---');

  // Haal alle offers op die nog geen 'networkId' hebben, maar wel een oude naam
  const offersToMigrate = await prisma.offer.findMany({
    where: {
      networkId: null,
      networkLegacy: { not: null } // We zoeken naar de gemapte kolom
    }
  });

  console.log(`🔎 ${offersToMigrate.length} offers gevonden om te migreren naar nieuwe Partner tabel...`);

  for (const offer of offersToMigrate) {
    if (!offer.networkLegacy) continue;

    // A. Maak het netwerk aan in de nieuwe tabel (of vind hem als ie al bestaat)
    // We gebruiken upsert zodat je geen dubbele krijgt
    const network = await prisma.affiliateNetwork.upsert({
      where: { name: offer.networkLegacy },
      update: {},
      create: { 
        name: offer.networkLegacy 
      }
    });

    // B. Update de offer met het nieuwe ID
    await prisma.offer.update({
      where: { id: offer.id },
      data: { networkId: network.id }
    });
    
    console.log(`   > Offer "${offer.name}" gekoppeld aan Partner "${network.name}"`);
  }
  
  console.log('✅ Alle netwerken zijn overgezet!');
  console.log('\n🎉 Migratie compleet! Je database is nu Multi-Tenant & Partner-ready.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });