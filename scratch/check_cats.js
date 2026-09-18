const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
    datasources: {
        db: {
            url: "postgresql://postgres.rkwnsabzjcblnhapyuwi:69lpeiSoE2bw3l8x@aws-0-ap-southeast-2.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=3"
        }
    }
});

async function main() {
  const cats = await prisma.forklift.groupBy({by: ['category'], _count: true});
  console.log("Categories:", cats);
  const powerTypes = await prisma.forklift.groupBy({by: ['powerType'], _count: true});
  console.log("PowerTypes:", powerTypes);
}

main().finally(() => prisma.$disconnect());
