const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash('admin123', 10); // <--- JOUW WACHTWOORD

  const admin = await prisma.user.upsert({
    where: { email: 'ricky@301.digital' }, // <--- JOUW EMAIL
    update: {},
    create: {
      email: 'ricky@301.digital',
      password: hashedPassword,
      name: 'Super Admin',
      role: 'SUPER_ADMIN', // <--- Belangrijk: SUPER_ADMIN
    },
  });

  console.log({ admin });
}

main()
  .then(async () => { await prisma.$disconnect(); })
  .catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });