const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
    datasources: {
        db: {
            url: "postgresql://postgres.rkwnsabzjcblnhapyuwi:69lpeiSoE2bw3l8x@aws-0-ap-southeast-2.pooler.supabase.com:6543/postgres?pgbouncer=true"
        }
    }
});

async function main() {
  const categories = await prisma.forklift.findMany({
    select: { category: true },
    distinct: ['category']
  });
  console.log('Categories:', categories.map(c => c.category).filter(Boolean));
  await prisma.$disconnect();
}

main();
