// prisma/seed.js
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Start seeding...')

  // 1. Maak eerst de database leeg (zodat je geen dubbele data krijgt als je dit script vaker draait)
  await prisma.conversion.deleteMany()
  await prisma.dailySpend.deleteMany()
  await prisma.offer.deleteMany()

  // 2. Maak Offers (Deals) aan
  console.log('Offers aanmaken...')
  const offerFinance = await prisma.offer.create({
    data: { name: 'Zorgverzekering 2025', network: 'Daisycon', payout: 35.00 }
  })

  const offerDating = await prisma.offer.create({
    data: { name: 'Dating Site Elite', network: 'TradeTracker', payout: 12.50 }
  })

  // 3. Maak Spend aan (Kosten voor de afgelopen 3 dagen)
  console.log('Spend invoeren...')
  
  // Vandaag
  await prisma.dailySpend.create({
    data: { date: new Date(), platform: 'Google', amount: 150.50 }
  })
  await prisma.dailySpend.create({
    data: { date: new Date(), platform: 'Microsoft', amount: 45.20 }
  })

  // Gisteren (we gebruiken even een helper functie voor de datum)
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)

  await prisma.dailySpend.create({
    data: { date: yesterday, platform: 'Google', amount: 140.00 }
  })

  // 4. Maak Conversies (Leads) aan
  console.log('Conversies toevoegen...')
  
  // 5 leads voor de zorgverzekering vandaag
  await prisma.conversion.create({
    data: { date: new Date(), count: 5, offerId: offerFinance.id }
  })

  // 12 leads voor dating gisteren
  await prisma.conversion.create({
    data: { date: yesterday, count: 12, offerId: offerDating.id }
  })

  console.log('✅ Seeding klaar!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })