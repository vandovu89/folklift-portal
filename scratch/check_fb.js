const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const pages = await prisma.facebookPage.findMany();
  console.log("Pages in DB:", pages);
}

main().catch(console.error).finally(() => prisma.$disconnect());
