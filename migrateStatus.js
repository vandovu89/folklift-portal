const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const result = await prisma.forklift.updateMany({
    where: { status: 'Published' },
    data: { status: 'Available' }
  });
  console.log('Updated ' + result.count + ' forklifts from Published to Available');
}

main().catch(console.error).finally(() => prisma.$disconnect());
